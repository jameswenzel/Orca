'use strict'

import { Client } from "./client"

export class Cursor {
  client: Client
  x: number
  y: number
  w: number
  h: number
  minX: number
  maxX: number
  minY: number
  maxY: number
  ins: boolean

  constructor(client: Client) {
    this.client = this.client
    this.x = 0
    this.y = 0
    this.w = 0
    this.h = 0

    this.minX = 0
    this.maxX = 0
    this.minY = 0
    this.maxY = 0

    this.ins = false

  }

  public start() {
    document.onmousedown = this.onMouseDown
    document.onmouseup = this.onMouseUp
    document.onmousemove = this.onMouseMove
    document.oncopy = this.onCopy
    document.oncut = this.onCut
    document.onpaste = this.onPaste
    document.oncontextmenu = this.onContextMenu
  }

  public select = (x = this.x, y = this.y, w = this.w, h = this.h) => {
    if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) { return }
    const rect = { x: this.clamp(parseInt(x as unknown as string), 0, this.client.orca.w - 1), y: this.clamp(parseInt(y as unknown as string), 0, this.client.orca.h - 1), w: this.clamp(parseInt(w as unknown as string), -this.x, this.client.orca.w - 1), h: this.clamp(parseInt(h as unknown as string), -this.y, this.client.orca.h - 1) }

    if (this.x === rect.x && this.y === rect.y && this.w === rect.w && this.h === rect.h) {
      return // Don't update when unchanged
    }

    this.x = rect.x
    this.y = rect.y
    this.w = rect.w
    this.h = rect.h
    this.calculateBounds()
    this.client.toggleGuide(false)
    this.client.update()
  }

  public selectAll() {
    this.select(0, 0, this.client.orca.w, this.client.orca.h)
    this.ins = false
  }

  public move = (x, y) => {
    this.select(this.x + parseInt(x), this.y - parseInt(y))
  }

  public moveTo = (x, y) => {
    this.select(x, y)
  }

  public scale = (w, h) => {
    this.select(this.x, this.y, this.w + parseInt(w), this.h - parseInt(h))
  }

  public scaleTo = (w, h) => {
    this.select(this.x, this.y, w, h)
  }

  public drag = (x, y) => {
    if (isNaN(x) || isNaN(y)) { return }
    this.ins = false
    const block = this.selection()
    this.erase()
    this.move(x, y)
    this.client.orca.writeBlock(this.minX, this.minY, block)
    this.client.history.record(this.client.orca.s)
  }
  public reset = (pos = false) => {
    this.select(pos ? 0 : this.x, pos ? 0 : this.y, 0, 0)
    this.ins = false
  }
  public read() {
    return this.client.orca.glyphAt(this.x, this.y)
  }
  public write = (g) => {
    if (!this.client.orca.isAllowed(g)) { return }
    if (this.client.orca.write(this.x, this.y, g) && this.ins) {
      this.move(1, 0)
    }
    this.client.history.record(this.client.orca.s)
  }
  public erase() {
    for (let y = this.minY; y <= this.maxY; y++) {
      for (let x = this.minX; x <= this.maxX; x++) {
        this.client.orca.write(x, y, '.')
      }
    }
    this.client.history.record(this.client.orca.s)
  }
  public find = (str) => {
    const i = this.client.orca.s.indexOf(str)
    if (i < 0) { return }
    const pos = this.client.orca.posAt(i)
    this.select(pos.x, pos.y, str.length - 1, 0)
  }
  public inspect() {
    if (this.w !== 0 || this.h !== 0) { return 'multi' }
    const index = this.client.orca.indexAt(this.x, this.y)
    const port = this.client.ports[index]
    if (port) { return `${port[3]}` }
    if (this.client.orca.lockAt(this.x, this.y)) { return 'locked' }
    return 'empty'
  }
  public trigger() {
    const operator = this.client.orca.operatorAt(this.x, this.y)
    if (!operator) { console.warn('Cursor', 'Nothing to trigger.'); return }
    console.log('Cursor', 'Trigger: ' + operator.name)
    operator.run(true)
  }
  public comment() {
    const block = this.selection()
    const lines = block.trim().split(/\r?\n/)
    const char = block.substr(0, 1) === '#' ? '.' : '#'
    const res = lines.map((line) => { return `${char}${line.substr(1, line.length - 2)}${char}` }).join('\n')
    this.client.orca.writeBlock(this.minX, this.minY, res)
    this.client.history.record(this.client.orca.s)
  }
  public toUpperCase() {
    const block = this.selection().toUpperCase()
    this.client.orca.writeBlock(this.minX, this.minY, block)
  }
  public toLowerCase() {
    const block = this.selection().toLowerCase()
    this.client.orca.writeBlock(this.minX, this.minY, block)
  }
  public toRect() {
    return {
      x: this.minX,
      y: this.minY,
      w: this.maxX - this.minX + 1,
      h: this.maxY - this.minY + 1
    }
  }
  public calculateBounds() {
    this.minX = this.x < this.x + this.w ? this.x : this.x + this.w
    this.minY = this.y < this.y + this.h ? this.y : this.y + this.h
    this.maxX = this.x > this.x + this.w ? this.x : this.x + this.w
    this.maxY = this.y > this.y + this.h ? this.y : this.y + this.h
  }
  public selected = (x, y, w = 0, h = 0) => {
    return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY
  }
  public selection = (rect = this.toRect()) => {
    return this.client.orca.getBlock(rect.x, rect.y, rect.w, rect.h)
  }
  public mouseFrom = null
  public onMouseDown = (e) => {
    if (e.button !== 0) { this.cut(); return }
    const pos = this.mousePick(e.clientX, e.clientY)
    this.select(pos.x, pos.y, 0, 0)
    this.mouseFrom = pos
  }
  public onMouseMove = (e) => {
    if (!this.mouseFrom) { return }
    const pos = this.mousePick(e.clientX, e.clientY)
    this.select(this.mouseFrom.x, this.mouseFrom.y, pos.x - this.mouseFrom.x, pos.y - this.mouseFrom.y)
  }
  public onMouseUp = (e) => {
    if (this.mouseFrom) {
      const pos = this.mousePick(e.clientX, e.clientY)
      this.select(this.mouseFrom.x, this.mouseFrom.y, pos.x - this.mouseFrom.x, pos.y - this.mouseFrom.y)
    }
    this.mouseFrom = null
  }
  public mousePick = (x, y, w = this.client.tile.w, h = this.client.tile.h) => {
    return { x: parseInt((x - 30) / w as unknown as string), y: parseInt((y - 30) / h as unknown as string) }
  }
  public onContextMenu = (e) => {
    e.preventDefault()
  }
  public copy = function () {
    document.execCommand('copy')
  }
  public cut = function () {
    document.execCommand('cut')
  }
  public paste = function (overlap = false) {
    document.execCommand('paste')
  }
  public onCopy = (e) => {
    e.clipboardData.setData('text/plain', this.selection())
    e.preventDefault()
  }
  public onCut = (e) => {
    this.onCopy(e)
    this.erase()
  }
  public onPaste = (e) => {
    const data = e.clipboardData.getData('text/plain').trim()
    this.client.orca.writeBlock(this.minX, this.minY, data, this.ins)
    this.client.history.record(this.client.orca.s)
    this.scaleTo(data.split(/\r?\n/)[0].length - 1, data.split(/\r?\n/).length - 1)
    e.preventDefault()
  }

  private clamp(v, min, max) { return v < min ? min : v > max ? max : v }
}
