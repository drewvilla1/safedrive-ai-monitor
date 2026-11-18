/**
 * SafeDrive AI Monitor — Risk Scoring Engine
 * 
 * Documented, explainable scoring algorithm (0-100 risk score).
 * Fuses in-cabin sensor events with vehicle telematics to produce
 * a composite distraction-risk score.
 * 
 * WEIGHTS (configurable):
 *   - Phone handling while moving:  +30
 *   - Texting while moving:         +35
 *   - Screen on while moving:       +20
 *   - Gaze off road:                +25
 *   - Hands off wheel:              +15
 *   - Speed factor:                 +0 to +10 (scales with speed)
 *   - Lane drift:                   +0 to +15
 *   - Repeated events:              +5 per recent event (max +20)
 *   - Duration factor:              +0 to +10
 * 
 * REDUCTIONS:
 *   - Vehicle stopped:              -40 (most events are benign)
 *   - Passenger present:            -20 (may be passenger's phone)
 *   - Missing data penalty:         confidence reduced, NOT score inflated
 * 
 * CONFIDENCE:
 *   Starts at 1.0, reduced by 0.15 per missing signal (speed, gaze, etc.)
 * 
 * THRESHOLD:
 *   Default warning threshold: 60/100
 */

export interface SensorInput {
  eventType: string; // phone_handling, screen_on, texting, gaze_off_road, hands_off_wheel
  confidence: number;
  duration?: number; // seconds
}

export interface TelematicsInput {
  speed?: number | null;
  laneDrift?: number | null;
  brakingForce?: number | null;
  isMoving: boolean;
  passengerPresent: boolean;
}

export interface RiskResult {
  score: number;
  confidence: number;
  factors: { factor: string; contribution: number; description: string }[];
  missingData: string[];
  exceededThreshold: boolean;
  threshold: number;
}

const EVENT_WEIGHTS: Record<string, { base: number; label: string }> = {
  phone_handling: { base: 30, label: 'Phone handling detected' },
  texting: { base: 35, label: 'Texting detected' },
  screen_on: { base: 20, label: 'Screen active during driving' },
  gaze_off_road: { base: 25, label: 'Gaze directed away from road' },
  hands_off_wheel: { base: 15, label: 'Hands off steering wheel' },
};

const DEFAULT_THRESHOLD = 60;

export function calculateRiskScore(
  sensors: SensorInput[],
  telematics: TelematicsInput,
  recentEventCount: number = 0,
  threshold: number = DEFAULT_THRESHOLD
): RiskResult {
  let rawScore = 0;
  const factors: RiskResult['factors'] = [];
  const missingData: string[] = [];
  let confidence = 1.0;

  // 1. Score each sensor event
  for (const sensor of sensors ?? []) {
    const weight = EVENT_WEIGHTS[sensor.eventType];
    if (weight) {
      const contribution = Math.round(weight.base * (sensor.confidence ?? 0.5));
      rawScore += contribution;
      factors.push({
        factor: sensor.eventType,
        contribution,
        description: `${weight.label} (confidence: ${((sensor.confidence ?? 0) * 100).toFixed(0)}%)`,
      });
    }
  }

  // 2. Speed factor
  if (telematics.speed != null) {
    const speedContrib = Math.min(10, Math.round((telematics.speed / 80) * 10));
    if (speedContrib > 0) {
      rawScore += speedContrib;
      factors.push({ factor: 'speed', contribution: speedContrib, description: `Speed ${telematics.speed} mph increases risk` });
    }
  } else {
    missingData.push('speed');
    confidence -= 0.15;
  }

  // 3. Lane drift factor
  if (telematics.laneDrift != null) {
    const driftContrib = Math.min(15, Math.round(telematics.laneDrift * 10));
    if (driftContrib > 0) {
      rawScore += driftContrib;
      factors.push({ factor: 'lane_drift', contribution: driftContrib, description: `Lane drift of ${telematics.laneDrift?.toFixed?.(1) ?? '0'}m detected` });
    }
  } else {
    missingData.push('lane_drift');
    confidence -= 0.1;
  }

  // 4. Duration factor
  const totalDuration = (sensors ?? []).reduce((sum: number, s: SensorInput) => sum + (s.duration ?? 0), 0);
  if (totalDuration > 3) {
    const durContrib = Math.min(10, Math.round((totalDuration / 10) * 10));
    rawScore += durContrib;
    factors.push({ factor: 'duration', contribution: durContrib, description: `Interaction lasted ${totalDuration.toFixed(1)}s` });
  }

  // 5. Repeated events
  if (recentEventCount > 0) {
    const repeatContrib = Math.min(20, recentEventCount * 5);
    rawScore += repeatContrib;
    factors.push({ factor: 'repeated_events', contribution: repeatContrib, description: `${recentEventCount} recent events in last 30 min` });
  }

  // 6. REDUCTIONS: vehicle stopped
  if (!telematics.isMoving) {
    const reduction = -40;
    rawScore += reduction;
    factors.push({ factor: 'vehicle_stopped', contribution: reduction, description: 'Vehicle appears stationary — reduced risk' });
  }

  // 7. REDUCTIONS: passenger present
  if (telematics.passengerPresent) {
    const reduction = -20;
    rawScore += reduction;
    factors.push({ factor: 'passenger_present', contribution: reduction, description: 'Passenger detected — may be using device' });
  }

  // 8. Missing data confidence penalty
  if (telematics.isMoving === undefined) {
    missingData.push('vehicle_status');
    confidence -= 0.15;
  }

  // Clamp
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  confidence = Math.max(0.1, Math.min(1.0, confidence));

  return {
    score,
    confidence,
    factors,
    missingData,
    exceededThreshold: score >= threshold,
    threshold,
  };
}
