'use strict'
import * as osc from 'node-osc';
import { Client } from '../../client';

type Options = {
  default: number
  tidalCycles: number
  sonicPi: number
  superCollider: number
  norns: number
}

export type OscEvent = {
  path: string,
  msg: string
}

export class Osc {
  client: Client
  stack: Array<OscEvent>
  socket: osc.Client
  port: number
  options: Options

  constructor(client: Client) {
    this.client = client 
    this.stack = []
    this.socket = null
    this.port = null
    this.options = { default: 49162, tidalCycles: 6010, sonicPi: 4559, superCollider: 57120, norns: 10111 }
  
  }
  // const osc = require('node-osc')


  public start() {
    if (!osc) { console.warn('OSC', 'Could not start.'); return }
    console.info('OSC', 'Starting..')
    this.setup()
    this.select()
  }

  public clear() {
    this.stack = []
  }

  public run() {
    for (const item of this.stack) {
      this.play(item)
    }
  }

  public push(path: string, msg: string) {
    this.stack.push({ path, msg })
  }

  public play({ path, msg }: {path: string, msg: string}): void {
    if (!this.socket) { console.warn('OSC', 'Unavailable socket'); return }
    const oscMsg = new osc.Message(path)
    for (let i = 0; i < msg.length; i++) {
      // TODO: fix? bug?
      oscMsg.append(this.client.orca.valueOf(msg.charAt(i)))
    }
    this.socket.send(oscMsg, (err: Error) => {
      if (err) { console.warn(err) }
    })
  }

  public select(port = this.options.default) {
    if (parseInt(port as unknown as string) === this.port) { console.warn('OSC', 'Already selected'); return }
    if (isNaN(port) || port < 1000) { console.warn('OSC', 'Unavailable port'); return }
    console.info('OSC', `Selected port: ${port}`)
    this.port = parseInt(port as unknown as string)
    this.setup()
  }

  public setup() {
    if (!this.port) { return }
    if (this.socket) { this.socket.close() }
    this.socket = new osc.Client(this.client.io.ip, this.port)
    console.info('OSC', `Started socket at ${this.client.io.ip}:${this.port}`)
  }
}
