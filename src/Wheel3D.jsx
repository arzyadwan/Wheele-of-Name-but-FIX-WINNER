import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Text } from '@react-three/drei';

const palette = ['#4285E1', '#16AD45', '#c78200', '#E52235'];
const TAU = Math.PI * 2;
const SPIN_DURATION_MS = 30_000;
const MINIMUM_TURNS = 18;
const TURN_VARIATION = 5;
const INITIAL_SPEED_MULTIPLIER = 3;
const DECELERATION_PORTION = 1 / 3;
const CRUISING_PORTION = 1 - DECELERATION_PORTION;
const CRUISING_DISTANCE = (2 * CRUISING_PORTION) / (DECELERATION_PORTION + (2 * CRUISING_PORTION));

const easeOutQuadratic = (progress) => 1 - Math.pow(1 - progress, 2);

const easeWithFinalDeceleration = (progress) => {
  if (progress <= CRUISING_PORTION) {
    return (progress / CRUISING_PORTION) * CRUISING_DISTANCE;
  }

  const decelerationProgress = (progress - CRUISING_PORTION) / DECELERATION_PORTION;
  return CRUISING_DISTANCE + ((1 - CRUISING_DISTANCE) * easeOutQuadratic(decelerationProgress));
};

const getSegmentColor = (index, total) => {
  const colorIndex = index % palette.length;
  const repeatsFirstColorAtEnd = total > 1 && index === total - 1 && colorIndex === 0;
  return palette[repeatsFirstColorAtEnd ? 1 : colorIndex];
};

const getPointerIndex = (rotation, count) => {
  const arc = TAU / count;
  const angleAtPointer = ((-rotation % TAU) + TAU) % TAU;
  return Math.floor(angleAtPointer / arc) % count;
};

const createSectorGeometry = (start, end) => {
  const radius = 2;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.absarc(0, 0, radius, start, end, false);
  shape.lineTo(0, 0);

  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    curveSegments: 48,
  });
};

const createPointerGeometry = () => {
  const shape = new THREE.Shape();
  shape.moveTo(-0.54, 0);
  shape.lineTo(0.18, 0.34);
  shape.lineTo(0.18, -0.34);
  shape.closePath();

  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.18,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.045,
    bevelThickness: 0.035,
  });
};

function Sector({ index, total, label }) {
  const arc = TAU / total;
  const start = index * arc;
  const center = start + arc / 2;
  const geometry = useMemo(() => createSectorGeometry(start, start + arc), [arc, start]);
  const maxWidth = Math.max(0.65, Math.min(1.45, arc * 1.25));
  const labelSize = Math.max(0.16, Math.min(0.31, arc * 0.19));
  const labelColor = '#ffffff';
  const labelRotation = center + Math.PI;

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group>
      <mesh geometry={geometry} position={[0, 0, 0.03]} castShadow receiveShadow>
        <meshStandardMaterial color={getSegmentColor(index, total)} roughness={0.42} metalness={0.06} />
      </mesh>
      <Text
        position={[Math.cos(center) * 1.28, Math.sin(center) * 1.28, 0.205]}
        rotation={[0, 0, labelRotation]}
        color={labelColor}
        anchorX="center"
        anchorY="middle"
        fontSize={labelSize}
        maxWidth={maxWidth}
        textAlign="center"
        outlineWidth={0.007}
        outlineColor="rgba(0,0,0,0.18)"
      >
        {label}
      </Text>
    </group>
  );
}

function Pointer({ materialRef }) {
  const geometry = useMemo(createPointerGeometry, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group position={[2.26, 0, 0.28]} rotation={[0, 0, 0]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          ref={materialRef}
          color="#FBC323"
          roughness={0.28}
          metalness={0.34}
          clearcoat={0.35}
          clearcoatRoughness={0.25}
        />
      </mesh>
    </group>
  );
}

function WheelAssembly({ names, spinCommand, hasSpun, onComplete, onTick }) {
  const wheelRef = useRef();
  const pointerMaterialRef = useRef();
  const spinRef = useRef(null);
  const lastTickRef = useRef(-1);

  useEffect(() => {
    if (!spinCommand || names.length === 0 || !wheelRef.current) return;

    const arc = TAU / names.length;
    const initialRotation = wheelRef.current.rotation.z;
    const targetRotation = -(spinCommand.winnerIndex * arc) - arc / 2;
    const turns = INITIAL_SPEED_MULTIPLIER * (MINIMUM_TURNS + (spinCommand.id % TURN_VARIATION));
    spinRef.current = {
      initialRotation,
      targetRotation,
      totalRotation: -(turns * TAU) + targetRotation - initialRotation,
      startedAt: null,
      duration: SPIN_DURATION_MS,
      winnerIndex: spinCommand.winnerIndex,
    };
    lastTickRef.current = -1;
  }, [names.length, spinCommand]);

  useFrame((state, delta) => {
    if (!wheelRef.current || names.length === 0) return;

    const activeSpin = spinRef.current;
    if (activeSpin) {
      if (activeSpin.startedAt === null) activeSpin.startedAt = state.clock.elapsedTime;
      const elapsed = (state.clock.elapsedTime - activeSpin.startedAt) * 1000;
      const progress = Math.min(elapsed / activeSpin.duration, 1);
      const eased = easeWithFinalDeceleration(progress);
      wheelRef.current.rotation.z = activeSpin.initialRotation + activeSpin.totalRotation * eased;

      const pointerIndex = getPointerIndex(wheelRef.current.rotation.z, names.length);
      if (pointerIndex !== lastTickRef.current) {
        lastTickRef.current = pointerIndex;
        onTick?.(progress);
      }

      if (progress === 1) {
        wheelRef.current.rotation.z = activeSpin.targetRotation;
        spinRef.current = null;
        onComplete(activeSpin.winnerIndex);
      }
    } else if (!hasSpun) {
      wheelRef.current.rotation.z = (wheelRef.current.rotation.z + delta * 0.075) % TAU;
    }

    const pointerIndex = getPointerIndex(wheelRef.current.rotation.z, names.length);
    pointerMaterialRef.current?.color.set(getSegmentColor(pointerIndex, names.length));
  });

  if (names.length === 0) {
    return (
      <Text color="#64748b" fontSize={0.32} anchorX="center" anchorY="middle">
        Tambahkan peserta terlebih dahulu
      </Text>
    );
  }

  return (
    <>
      <group ref={wheelRef}>
        <mesh position={[0, 0, -0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.08, 2.08, 0.18, 96]} />
          <meshStandardMaterial color="#334155" roughness={0.32} metalness={0.42} />
        </mesh>
        {names.map((name, index) => (
          <Sector key={`${name}-${index}`} index={index} total={names.length} label={name} />
        ))}
        <mesh position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.52, 0.52, 0.16, 64]} />
          <meshPhysicalMaterial color="#f8fafc" roughness={0.24} metalness={0.08} clearcoat={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.33]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.13, 0.1, 48]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.26} metalness={0.65} />
        </mesh>
      </group>
      <Pointer materialRef={pointerMaterialRef} />
    </>
  );
}

function Scene({ names, spinCommand, hasSpun, onComplete, onTick }) {
  return (
    <>
      <ambientLight intensity={1.25} />
      <directionalLight position={[-3, 5, 6]} intensity={2.1} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[3.5, -1, 3]} intensity={1.6} color="#fff6d4" />
      <WheelAssembly
        names={names}
        spinCommand={spinCommand}
        hasSpun={hasSpun}
        onComplete={onComplete}
        onTick={onTick}
      />
      <ContactShadows position={[0, -2.45, -0.4]} opacity={0.28} scale={6.4} blur={2.5} far={4.5} />
      <Environment preset="city" />
    </>
  );
}

export default function Wheel3D(props) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 7.2], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <Scene {...props} />
    </Canvas>
  );
}
