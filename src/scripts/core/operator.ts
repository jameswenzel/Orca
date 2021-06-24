import { Orca } from "./orca"


type PortType = 0 | 1 | 2 | 3
type GlyphName = string
type Xin = number
type Yin = number

export type PortInfo = [Xin, Yin, PortType, GlyphName]

export interface Clamp {
  min?: number
  max?: number
}

export interface Clampable extends Port {
  clamp?: Clamp
}

export interface Defaultable extends Port {
  default?: string
}

export interface Port {
  x: number
  y: number
  bang?: boolean
}

export interface Output extends Port {
  sensitive?: boolean
  reader?: boolean
  output: boolean
}

type Ports = {
  a?: Port
  b?: Port
  x?: Port
  y?: Port
  len?: Clampable
  output?: Output
  rate?: Defaultable & Clampable
  mod?: Defaultable
  step?: Defaultable & Clampable
  key?: Port
  val?: Port
  read?: Port
  min?: Defaultable & Clampable
  max?: Defaultable & Clampable
  write?: Port
  target?: Port
  path?: Port,
  channel?: Clampable
  octave?: Clampable
  note?: Port,
  velocity?: Defaultable & Clampable,
  length?: Defaultable & Clampable,
  knob?: Clampable,
  value?: Clampable,
  msb?: Clampable
  lsb?: Clampable
  // bang?: boolean
  // [key: string]: Port
}

export abstract class Operator<U> {
  orca: Orca
  name: string
  x: number
  y: number
  passive: boolean
  draw: boolean
  glyph: string
  info: string
  ports: Ports

  constructor(orca: Orca, x: number, y: number, glyph = '.', passive = false) {
    this.orca = orca
    this.name = 'unknown'
    this.x = x
    this.y = y
    this.passive = passive
    this.draw = passive
    this.glyph = passive ? glyph.toUpperCase() : glyph
    this.info = '--'
    this.ports = {}
  }


  // Actions

  
  public listen<T extends Port>(port: T): string;
  public listen<T extends Port>(port: T, toValue: boolean): number;
  
  public listen<T extends Port>(port: T, toValue?: boolean) {
    if (!port) { return (toValue ? 0 : '.') }
    const g = this.orca.glyphAt(this.x + port.x, this.y + port.y)
    const defaultable = port as Defaultable;
    const glyph = (g === '.' || g === '*') && defaultable.default ? defaultable.default : g
    if (toValue) {
      const clampable = (port as unknown as Clampable)
      const min = clampable.clamp && clampable.clamp.min ? clampable.clamp.min : 0
      const max = clampable.clamp && clampable.clamp.max ? clampable.clamp.max : 36
      return this.clamp(this.orca.valueOf(glyph), min, max)
    }
    return glyph
  }

  public output(g: string, port = this.ports.output) {
    if (!port) { console.warn(this.name, 'Trying to output, but no port'); return }
    if (!g) { return }
    this.orca.write(this.x + port.x, this.y + port.y, this.shouldUpperCase() === true ? `${g}`.toUpperCase() : g)
  }

  public bang(b: any) {
    if (!this.ports.output) { console.warn(this.name, 'Trying to bang, but no port'); return }
    this.orca.write(this.x + this.ports.output.x, this.y + this.ports.output.y, b ? '*' : '.')
    this.orca.lock(this.x + this.ports.output.x, this.y + this.ports.output.y)
  }

  // Phases

  public run(force = false) {
    // Operate
    const payload = this.operation(force)
    // Permissions
    for (const port of Object.values(this.ports)) {
      if (port.bang) { continue }
      this.orca.lock(this.x + (port as Output).x, this.y + (port as Output).y)
    }

    if (this.ports.output) {
      if (this.ports.output.bang === true) {
        this.bang(payload)
      } else {
        this.output(payload as unknown as string)
      }
    }
  }

  public abstract operation(force: boolean): U;

  // Helpers

  public lock() {
    this.orca.lock(this.x, this.y)
  }

  public replace(g: string) {
    this.orca.write(this.x, this.y, g)
  }

  public erase() {
    this.replace('.')
  }

  public explode() {
    this.replace('*')
  }

  public move(x: number, y: number) {
    const offset = { x: this.x + x, y: this.y + y }
    if (!this.orca.inBounds(offset.x, offset.y)) { this.explode(); return }
    if (this.orca.glyphAt(offset.x, offset.y) !== '.') { this.explode(); return }
    this.erase()
    this.x += x
    this.y += y
    this.replace(this.glyph)
    this.lock()
  }

  public hasNeighbor(g: string) {
    if (this.orca.glyphAt(this.x + 1, this.y) === g) { return true }
    if (this.orca.glyphAt(this.x - 1, this.y) === g) { return true }
    if (this.orca.glyphAt(this.x, this.y + 1) === g) { return true }
    if (this.orca.glyphAt(this.x, this.y - 1) === g) { return true }
    return false
  }

  // Docs

  public addPort<T extends Port>(name: string, pos: T): void {
    (this.ports as {[key: string]: Port})[name] = pos
  }

  public getPorts(): PortInfo[] {
    const a: PortInfo[] = []
    if (this.draw === true) {
      a.push([this.x, this.y, 0, `${this.name.charAt(0).toUpperCase() + this.name.substring(1).toLowerCase()}`])
    }
    if (!this.passive) { return a }
    for (const id in this.ports) {
      const port = (this.ports as {[key: string]: Port})[id]
      const type = (port as Output).output ? 3 : ((port.x < 0 || port.y < 0) ? 1 : 2)
      a.push([this.x + port.x, this.y + port.y, type, `${this.glyph}-${id}`])
    }
    return a
  }

  public shouldUpperCase(ports = this.ports) {
    if (!this.ports.output || !this.ports.output.sensitive) { return false }
    const value = this.listen({ x: 1, y: 0 })
    if ((value as string).toLowerCase() === (value as string).toUpperCase()) { return false }
    if ((value as string).toUpperCase() !== value) { return false }
    return true
  }

  // Docs

  private clamp(v: number, min: number, max: number): number { return v < min ? min : v > max ? max : v }
}
