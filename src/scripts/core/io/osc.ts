'use strict'

import osc, { Client } from 'node-osc';

type Options = {
  default: number
  tidalCycles: number
  sonicPi: number
  superCollider: number
  norns: number
}
export class Osc {
  client: Client
  stack: Array<any>
  socket: any
  port: number
  options: Options

  constructor(client) {
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

  public push(path, msg) {
    this.stack.push({ path, msg })
  }

  public play({ path, msg }) {
    if (!this.socket) { console.warn('OSC', 'Unavailable socket'); return }
    const oscMsg = new osc.Message(path)
    for (let i = 0; i < msg.length; i++) {
      // TODO: fix? bug?
      oscMsg.append(this.client.orca.valueOf(msg.charAt(i)))
    }
    this.socket.send(oscMsg, (err) => {
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
