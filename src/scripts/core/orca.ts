'use strict'

import { Client } from "../client"
import { Library, LibraryType, OperatorA } from "./Library"
import { Operator } from "./operator"

export class Orca {
  client: Client
  w: number
  h: number
  f: number
  s: string
  locks: boolean[]
  runtime: Operator<any>[]
  variables: { [key: string]: string }
  keys: string[]

  constructor(client: Client) {
    this.client = client
    this.keys = '0123456789abcdefghijklmnopqrstuvwxyz'.split('')

    this.w = 1 // Default Width
    this.h = 1 // Default Height
    this.f = 0 // Frame
    this.s = '' // String

    this.locks = []
    this.runtime = []
    this.variables = {}
    this.reset();
  }


  public run() {
    this.runtime = this.parse()
    this.operate(this.runtime)
    this.f += 1
  }

  public reset(w = this.w, h = this.h) {
    this.f = 0
    this.w = w
    this.h = h
    this.replace(new Array((this.h * this.w) + 1).join('.'))
  }

  public load(w: number, h: number, s: string, f = 0) {
    this.w = w
    this.h = h
    this.f = f
    this.replace(this.clean(s))
    return this
  }

  public write(x: number, y: number, g: string /*| any[]*/) {
    if (!g) { return false }
    if (g.length !== 1) { return false }
    if (!this.inBounds(x, y)) { return false }
    if (this.glyphAt(x, y) === g) { return false }
    const index = this.indexAt(x, y)
    const glyph = !this.isAllowed(g) ? '.' : g
    const string = this.s.substr(0, index) + glyph + this.s.substr(index + 1)
    this.replace(string)
    return true
  }

  public clean(str: string) {
    return `${str}`.replace(/\n/g, '').trim().substr(0, this.w * this.h).split('').map((g) => {
      return !this.isAllowed(g) ? '.' : g
    }).join('')
  }

  public replace(s: string) {
    this.s = s
  }

  // Operators

  public parse() {

    const a: Operator<any>[] = []
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const g = this.glyphAt(x, y)
        if (g === '.' || !this.isAllowed(g)) { continue }
        a.push(new Library[g.toLowerCase() as keyof LibraryType](this, x, y, g === g.toUpperCase()))
      }
    }
    return a
  }

  public operate(operators: Operator<any>[]) {
    this.release()
    for (const operator of operators) {
      if (this.lockAt(operator.x, operator.y)) { continue }
      if (operator.passive || operator.hasNeighbor('*')) {
        operator.run()
      }
    }
  }

  public bounds() {
    let w = 0
    let h = 0
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const g = this.glyphAt(x, y)
        if (g !== '.') {
          if (x > w) { w = x }
          if (y > h) { h = y }
        }
      }
    }
    return { w, h }
  }

  // Blocks

  public getBlock = (x: number, y: number, w: number, h: number) => {
    let lines = ''
    for (let _y = y; _y < y + h; _y++) {
      let line = ''
      for (let _x = x; _x < x + w; _x++) {
        line += this.glyphAt(_x, _y)
      }
      lines += line + '\n'
    }
    return lines
  }

  public writeBlock = (x: number, y: number, block: string, overlap = false) => {
    if (!block) { return }
    const lines = block.split(/\r?\n/)
    let _y = y
    for (const line of lines) {
      let _x = x
      for (const glyph of line) {
        const glyph = line[y]
        this.write(_x, _y, overlap === true && glyph === '.' ? this.glyphAt(_x, _y) : glyph)
        _x++
      }
      _y++
    }
  }

  // Locks

  public release() {
    this.locks = new Array(this.w * this.h)
    this.variables = {}
  }

  public unlock(x: number, y: number) {
    this.locks[this.indexAt(x, y)] = null
  }

  public lock(x: number, y: number) {
    if (this.lockAt(x, y)) { return }
    this.locks[this.indexAt(x, y)] = true
  }

  // Helpers

  public inBounds(x: number, y: number) {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < this.w && y >= 0 && y < this.h
  }

  public isAllowed(g: string): boolean {
    return g === '.'
      || !!Library[`${g}`.toLowerCase() as keyof LibraryType]
  }

  public isSpecial(g: string) {
    return g.toLowerCase() === g.toUpperCase() && isNaN(g as unknown as number)
  }

  public keyOf(val: number, uc = false) {
    return uc === true ? this.keys[val % 36].toUpperCase() : this.keys[val % 36]
  }

  public valueOf(g: string): number {
    return !g || g === '.' || g === '*' ? 0 : this.keys.indexOf(`${g}`.toLowerCase())
  }

  public indexAt(x: number, y: number) {
    return this.inBounds(x, y) === true ? x + (this.w * y) : -1
  }

  public operatorAt(x: number, y: number) {
    return this.runtime.filter((item) => { return item.x === x && item.y === y })[0]
  }

  public posAt(index: number) {
    return { x: index % this.w, y: parseInt(index / this.w as unknown as string) }
  }

  public glyphAt(x: number, y: number): string {
    return this.s.charAt(this.indexAt(x, y))
  }

  public valueAt(x: number, y: number): number {
    return this.valueOf(this.glyphAt(x, y))
  }

  public lockAt(x: number, y: number): boolean {
    return this.locks[this.indexAt(x, y)] === true
  }

  public valueIn(key: string): any {
    return this.variables[key] || '.'
  }

  // Tools

  public format() {
    const a = []
    for (let y = 0; y < this.h; y++) {
      a.push(this.s.substr(y * this.w, this.w))
    }
    return a.reduce((acc, val) => {
      return `${acc}${val}\n`
    }, '')
  }

  public length() {
    return this.strip().length
  }

  public strip() {
    return this.s.replace(/[^a-zA-Z0-9+]+/gi, '').trim()
  }

  public toString() {
    return this.format().trim()
  }

  public toRect(str = this.s) {
    const lines = str.trim().split(/\r?\n/)
    return { x: lines[0].length, y: lines.length }
  }

}
