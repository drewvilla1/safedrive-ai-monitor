export const dynamic = 'force-dynamic';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { calculateRiskScore } from '@/lib/risk-scoring';
import { getSeverityFromScore, pickWarning } from '@/lib/warning-templates';

const EVENT_TYPES = ['phone_handling', 'screen_on', 'texting', 'gaze_off_road', 'hands_off_wheel'];
const DRIVER_NAMES = ['Marcus Johnson', 'Sarah Chen', 'David Rodriguez', 'Emily Park', 'James Wilson', 'Lisa Thompson', 'Michael Brown', 'Anna Garcia'];
const SCENARIOS = ['phone_while_moving', 'passenger_use', 'stopped_vehicle', 'missing_data', 'benign'];

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]!; }

function generateStreamEvent() {
  const scenario = pick(SCENARIOS);
  const driverName = pick(DRIVER_NAMES);

  let eventType: string;
  let sensorConf: number;
  let duration: number;
  let speed: number | null;
  let laneDrift: number | null;
  let isMoving: boolean;
  let passengerPresent: boolean;

  switch (scenario) {
    case 'phone_while_moving':
      eventType = pick(['phone_handling', 'texting', 'screen_on']);
      sensorConf = rand(0.7, 0.98);
      duration = rand(3, 25);
      speed = rand(25, 75);
      laneDrift = rand(0.1, 1.5);
      isMoving = true;
      passengerPresent = false;
      break;
    case 'passenger_use':
      eventType = pick(['phone_handling', 'screen_on']);
      sensorConf = rand(0.4, 0.7);
      duration = rand(5, 60);
      speed = rand(20, 65);
      laneDrift = rand(0, 0.3);
      isMoving = true;
      passengerPresent = true;
      break;
    case 'stopped_vehicle':
      eventType = pick(['phone_handling', 'texting', 'screen_on']);
      sensorConf = rand(0.8, 0.99);
      duration = rand(10, 120);
      speed = 0;
      laneDrift = 0;
      isMoving = false;
      passengerPresent = Math.random() > 0.5;
      break;
    case 'missing_data':
      eventType = pick(['phone_handling', 'screen_on', 'gaze_off_road']);
      sensorConf = rand(0.3, 0.6);
      duration = rand(2, 15);
      speed = null;
      laneDrift = null;
      isMoving = Math.random() > 0.5;
      passengerPresent = false;
      break;
    default:
      eventType = pick(['hands_off_wheel', 'screen_on']);
      sensorConf = rand(0.2, 0.45);
      duration = rand(0.5, 2);
      speed = rand(0, 45);
      laneDrift = rand(0, 0.15);
      isMoving = Math.random() > 0.3;
      passengerPresent = Math.random() > 0.6;
      break;
  }

  const risk = calculateRiskScore(
    [{ eventType, confidence: sensorConf, duration }],
    { speed, laneDrift, brakingForce: rand(0, 0.3), isMoving, passengerPresent },
    Math.floor(rand(0, 3))
  );

  const severity = getSeverityFromScore(risk.score);
  const warning = risk.exceededThreshold ? pickWarning(severity) : null;

  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    driver: driverName,
    scenario,
    sensor: {
      eventType,
      confidence: parseFloat(sensorConf.toFixed(3)),
      duration: parseFloat(duration.toFixed(1)),
    },
    telematics: {
      speed: speed != null ? parseFloat(speed.toFixed(1)) : null,
      laneDrift: laneDrift != null ? parseFloat(laneDrift.toFixed(2)) : null,
      isMoving,
      passengerPresent,
    },
    risk: {
      score: risk.score,
      confidence: parseFloat(risk.confidence.toFixed(3)),
      exceededThreshold: risk.exceededThreshold,
      factors: risk.factors,
      missingData: risk.missingData,
    },
    warning,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let running = true;

      const send = () => {
        if (!running) return;
        try {
          const event = generateStreamEvent();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          running = false;
        }
      };

      // Send initial events
      for (let i = 0; i < 3; i++) send();

      // Then send new events every 2-5 seconds
      const interval = setInterval(() => {
        if (!running) { clearInterval(interval); return; }
        send();
      }, 2500);

      // Auto-close after 5 minutes
      setTimeout(() => {
        running = false;
        clearInterval(interval);
        try { controller.close(); } catch {}
      }, 300000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
