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
  public clear() {
    this.midi.clear()
    this.cc.clear()
    this.mono.clear()
    this.udp.clear()
    this.osc.clear()
  }
  public run() {
    this.midi.run()
    this.cc.run()
    this.mono.run()
    this.udp.run()
    this.osc.run()
  }
  public silence() {
    this.midi.silence()
    this.mono.silence()
  }
  public setIp (addr = '127.0.0.1') {
    if (this.validateIP(addr) !== true && addr.indexOf('.local') === -1) { console.warn('IO', 'Invalid IP'); return }
    this.ip = addr
    console.log('IO', 'Set target IP to ' + this.ip)
    this.osc.setup()
  }
  public length() {
    return this.midi.length() + this.mono.length() + this.cc.stack.length + this.udp.stack.length + this.osc.stack.length
  }
  public inspect(limit = this.client.grid.w) {
    let text = ''
    for (let i = 0; i < this.length(); i++) {
      text += '|'
    }
    return this.fill(text, limit, '.')
  }

  private validateIP(addr: string): boolean { return !!(/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(addr)) }
  private fill(str: string, len: number, chr: string): string { while (str.length < len) { str += chr }; return str }
}
