/**
 * A damped spring for pointer-driven motion (tilt, magnetic). Damping is at
 * or above critical, so a value settles without bouncing
 * (docs/frontend/motion-design.md: nothing bounces).
 */
export class Spring {
  value = 0;
  target = 0;
  private velocity = 0;

  constructor(
    private readonly stiffness = 120,
    /** Defaults to critical damping for the stiffness. */
    private readonly damping = 2 * Math.sqrt(stiffness),
  ) {}

  /** Advance by `seconds` (capped, so a background tab cannot explode it). */
  step(seconds: number): number {
    let remaining = Math.min(Math.max(seconds, 0), 1 / 30);
    const slice = 1 / 240;
    while (remaining > 0) {
      const dt = Math.min(slice, remaining);
      const force =
        this.stiffness * (this.target - this.value) -
        this.damping * this.velocity;
      this.velocity += force * dt;
      this.value += this.velocity * dt;
      remaining -= dt;
    }
    return this.value;
  }

  /** Close enough to the target that the loop can stop. */
  get settled(): boolean {
    return (
      Math.abs(this.target - this.value) < 0.001 &&
      Math.abs(this.velocity) < 0.001
    );
  }

  /** Jump to the target, with no motion. */
  snap(): void {
    this.value = this.target;
    this.velocity = 0;
  }
}
