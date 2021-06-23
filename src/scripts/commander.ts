'use strict'

import { Client } from "./client"


class Actives {

  client: Client

  constructor(client: Client) {
    this.client = this.client;
  }
  
  // Ports
  osc(p) { this.client.io.osc.select(p.int) }
  
  udp(p) {
    this.client.io.udp.selectOutput(p.x)
    if (p.y !== null) { this.client.io.udp.selectInput(p.y) }
  }
  
  midi(p) {
    this.client.io.midi.selectOutput(p.x)
    if (p.y !== null) { this.client.io.midi.selectInput(p.y) }
  }
  
  ip(p) { this.client.io.setIp(p.str) }
  
  cc(p) { this.client.io.cc.setOffset(p.int) }
  
  pg(p) { this.client.io.cc.stack.push({ channel: clamp(p.ints[0], 0, 15), bank: p.ints[1], sub: p.ints[2], pgm: clamp(p.ints[3], 0, 127), type: 'pg' }); this.client.io.cc.run() }
  
  
  // Cursor
  copy(p) { this.client.cursor.copy() }
  
  paste(p) { this.client.cursor.paste(true) }
  
  erase(p) { this.client.cursor.erase() }
  
  
  // Controls
  
  play(p) { this.client.clock.play() }
  
  stop(p) { this.client.clock.stop() }
  
  run(p) { this.client.run() }
  
  
  // Time
  
  apm(p) { this.client.clock.setSpeed(null, p.int) }
  
  bpm(p) { this.client.clock.setSpeed(p.int, p.int, true) }
  
  frame(p) { this.client.clock.setFrame(p.int) }
  
  rewind(p) { this.client.clock.setFrame(this.client.orca.f - p.int) }
  
  skip(p) { this.client.clock.setFrame(this.client.orca.f + p.int) }
  
  time(p, origin) {
    const formatted = new Date(250 * (this.client.orca.f * (60 / this.client.clock.speed.value))).toISOString().substr(14, 5).replace(/:/g, '')
    this.client.orca.writeBlock(origin ? origin.x : this.client.cursor.x, origin ? origin.y : this.client.cursor.y, `${formatted}`)
  }
  
  
  // Themeing
  
  color(p) {
    if (p.parts[0]) { this.client.theme.set('b_low', p.parts[0]) }
    if (p.parts[1]) { this.client.theme.set('b_med', p.parts[1]) }
    if (p.parts[2]) { this.client.theme.set('b_high', p.parts[2]) }
  }
  
  
  // Edit
  
  find(p) { this.client.cursor.find(p.str) }
  
  select(p) { this.client.cursor.select(p.x, p.y, p.w || 0, p.h || 0) }
  
  inject(p, origin) {
    const block = this.client.source.cache[p._str + '.orca']
    if (!block) { console.warn('Commander', 'Unknown block: ' + p._str); return }
    this.client.orca.writeBlock(origin ? origin.x : this.client.cursor.x, origin ? origin.y : this.client.cursor.y, block)
    this.client.cursor.scaleTo(0, 0)
  }
  
  write(p) {
    this.client.orca.writeBlock(p._x || this.client.cursor.x, p._y || this.client.cursor.y, p._str)
  }
}

class Passives {

  client: Client
  constructor(client) {
    this.client = this.client;
  }
  find(p) { this.client.cursor.find(p.str) }
  select(p) { this.client.cursor.select(p.x, p.y, p.w || 0, p.h || 0) }
  inject(p) {
    this.client.cursor.select(p._x, p._y)
    if (this.client.source.cache[p._str + '.orca']) {
      const block = this.client.source.cache[p._str + '.orca']
      const rect = this.client.orca.toRect(block)
      this.client.cursor.scaleTo(rect.x, rect.y)
    }
  }
}


class Param {
  str: string
  length: number
  chars: Array<string>
  int: number
  parts: Array<string>
  ints: Array<number>
  x: number
  y: number
  w: number
  h: number
  _str: string
  _x: number
  _y: number

  constructor(val) {
    this.str = `${val}`
    this.length = this.str.length
    this.chars = this.str.split('')
    this.int = !isNaN(val) ? parseInt(val) : null
    this.parts = val.split(';')
    this.ints = this.parts.map((val) => { return parseInt(val) })
    this.x = parseInt(this.parts[0])
    this.y = parseInt(this.parts[1])
    this.w = parseInt(this.parts[2])
    this.h = parseInt(this.parts[3])
    // Optionals Position Style
    this._str = this.parts[0]
    this._x = parseInt(this.parts[1])
    this._y = parseInt(this.parts[2])
  }
}

export class Commander {
  client: Client
  isActive: boolean
  query: string
  history: Array<any>
  historyIndex: number
  actives: Actives
  passives: Passives

  constructor(client: Client) {
    this.client = this.client
    this.isActive = false
    this.query = ''
    this.history = []
    this.historyIndex = 0

    // Library


    this.passives = new Passives(client);

    this.actives = new Actives(client);

    // Make shorthands
    for (const id in this.actives) {
      this.actives[id.substr(0, 2)] = this.actives[id]
    }

  }
  // Begin

  public start(q = '') {
    this.isActive = true
    this.query = q
    this.client.cursor.ins = false
    this.client.update()
  }

  public stop = () => {
    this.isActive = false
    this.query = ''
    this.historyIndex = this.history.length
    this.client.update()
  }

  public erase = function () {
    this.query = this.query.slice(0, -1)
    this.preview()
  }

  public write = (key) => {
    if (key === 'Backspace') { this.erase(); return }
    if (key === 'Enter') { this.run(); return }
    if (key === 'Escape') { this.stop(); return }
    if (key.length > 1) { return }
    this.query += key
    this.preview()
  }

  public run = function () {
    const tool = this.isActive === true ? 'commander' : 'cursor'
    this.client[tool].trigger()
    this.client.update()
  }

  public trigger = function (msg = this.query, origin = null, stopping = true) {
    const cmd = `${msg}`.split(':')[0].trim().replace(/\W/g, '').toLowerCase()
    const val = `${msg}`.substr(cmd.length + 1)
    const fn = this.actives[cmd]
    if (!fn) { console.warn('Commander', `Unknown message: ${msg}`); this.stop(); return }
    fn(new Param(val), origin)
    this.history.push(msg)
    this.historyIndex = this.history.length
    if (stopping) {
      this.stop()
    }
  }

  public preview = function (msg = this.query) {
    const cmd = `${msg}`.split(':')[0].toLowerCase()
    const val = `${msg}`.substr(cmd.length + 1)
    if (!this.passives[cmd]) { return }
    this.passives[cmd](new Param(val), false)
  }

  // Events

  public onKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) { return }
    this.client[this.isActive === true ? 'commander' : 'cursor'].write(e.key)
    e.stopPropagation()
  }

  public onKeyUp = (e) => {
    this.client.update()
  }

  // UI

  public toString = function () {
    return `${this.query}`
  }

  // Utils

}
function clamp(v, min, max) { return v < min ? min : v > max ? max : v }
