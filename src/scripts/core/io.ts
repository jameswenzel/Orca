'use strict'

import { Client } from '../client'
import { MidiCC } from './io/cc';
import { Midi } from './io/midi';
import { Mono } from './io/mono';
import { Osc } from './io/osc';
import { Udp } from './io/udp';


export class IO {
  client: Client
  ip: string
  midi: Midi
  cc: MidiCC
  mono: Mono
  udp: Udp
  osc: Osc

  constructor(client: Client) {
    this.client = client;
    this.ip = '127.0.0.1'

    this.midi = new Midi(client)
    this.cc = new MidiCC(client)
    this.mono = new Mono(client)
    this.udp = new Udp(client)
    this.osc = new Osc(client)
  }

  public start() {
    this.midi.start()
    this.cc.start()
    this.mono.start()
    this.udp.start()
    this.osc.start()
    this.clear()
  }
  public clear = function () {
    this.midi.clear()
    this.cc.clear()
    this.mono.clear()
    this.udp.clear()
    this.osc.clear()
  }
  public run = function () {
    this.midi.run()
    this.cc.run()
    this.mono.run()
    this.udp.run()
    this.osc.run()
  }
  public silence = function () {
    this.midi.silence()
    this.mono.silence()
  }
  public setIp = function (addr = '127.0.0.1') {
    if (this.validateIP(addr) !== true && addr.indexOf('.local') === -1) { console.warn('IO', 'Invalid IP'); return }
    this.ip = addr
    console.log('IO', 'Set target IP to ' + this.ip)
    this.osc.setup()
  }
  public length = function () {
    return this.midi.length() + this.mono.length() + this.cc.stack.length + this.udp.stack.length + this.osc.stack.length
  }
  public inspect(limit = this.client.grid.w) {
    let text = ''
    for (let i = 0; i < this.length(); i++) {
      text += '|'
    }
    return this.fill(text, limit, '.')
  }

  private validateIP(addr) { return !!(/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(addr)) }
  private fill(str, len, chr) { while (str.length < len) { str += chr }; return str }
}
