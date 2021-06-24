'use strict'

import { Client } from "../client"
import { Orca } from "../core/orca"
import { clamp } from "./Util"

export class History {

  client: Client
  index: number
  frames: string[]
  host: Orca
  key: string

  constructor(client: Client) {
    this.client = client
  this.index = 0
  this.frames = []
  this.host = null
  this.key = null
  }

  public bind(host:Orca, key: string) {
    console.log('History is recording..')
    this.host = host
    this.key = key
    this.reset()
  }

  public reset() {
    this.index = 0
    this.frames = []
  }

  record(data: string) {
    if (this.index === this.frames.length) {
      this.append(data)
    } else {
      this.fork(data)
    }
    this.trim()
    this.index = this.frames.length
  }

  public undo(){
    if (this.index === 0) { console.warn('History', 'Reached beginning'); return }
    this.index = clamp(this.index - 1, 0, this.frames.length - 2)
    this.apply(this.frames[this.index])
  }

  public redo(){
    if (this.index + 1 > this.frames.length - 1) { console.warn('History', 'Reached end'); return }
    this.index = clamp(this.index + 1, 0, this.frames.length - 1)
    this.apply(this.frames[this.index])
  }

  public apply(f: string) {
    if (!(this.host as unknown as {[key: string]: string})[this.key]) { console.log(`Unknown binding to key ${this.key}`); return }
    if (!f || f.length !== (this.host as unknown as {[key: string]: string})[this.key].length) { return }
    (this.host as unknown as {[key: string]: string})[this.key] = this.frames[this.index]
  }

  public append(data: string) {
    if (!data) { return }
    if (this.frames[this.index - 1] && this.frames[this.index - 1] === data) { return }
    this.frames.push(data)
  }

  public fork(data: string) {
    this.frames = this.frames.slice(0, this.index + 1)
    this.append(data)
  }

  public trim(limit = 30) {
    if (this.frames.length < limit) { return }
    this.frames.shift()
  }

  public last(){
    return this.frames[this.index - 1]
  }

  public length(){
    return this.frames.length
  }

}
