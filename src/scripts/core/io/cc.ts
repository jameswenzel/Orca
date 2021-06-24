import { Client } from "../../client"

export type MidiCCMessage = {
  type: string,
  channel: number,
  lsb?: number,
  msb?: number,
  value?: number,
  knob?: number,
  bank?: number,
  sub?: number,
  pgm?: number

}

export class MidiCC {
  stack: Array<MidiCCMessage>
  offset: number
  client: Client

  constructor(client: Client) {
    this.client = client
    this.stack = []
    this.offset = 64
  }


  public start() {
    console.info('MidiCC', 'Starting..')
  }

  public clear = function () {
    this.stack = []
  }

  public run() {
    if (this.stack.length < 1) { return }
    const device = this.client.io.midi.outputDevice()
    if (!device) { console.warn('CC', 'No Midi device.'); return }
    for (const msg of this.stack) {
      if (msg.type === 'cc' && !isNaN(msg.channel) && !isNaN(msg.knob) && !isNaN(msg.value)) {
        device.send([0xb0 + msg.channel, this.offset + msg.knob, msg.value])
      } else if (msg.type === 'pb' && !isNaN(msg.channel) && !isNaN(msg.lsb) && !isNaN(msg.msb)) {
        device.send([0xe0 + msg.channel, msg.lsb, msg.msb])
      } else if (msg.type === 'pg' && !isNaN(msg.channel)) {
        if (!isNaN(msg.bank)) { device.send([0xb0 + msg.channel, 0, msg.bank]) }
        if (!isNaN(msg.sub)) { device.send([0xb0 + msg.channel, 32, msg.sub]) }
        if (!isNaN(msg.pgm)) { device.send([0xc0 + msg.channel, msg.pgm]) }
      } else {
        console.warn('CC', 'Unknown message', msg)
      }
    }
  }

  public setOffset(offset: number) {
    if (isNaN(offset)) { return }
    this.offset = offset
    console.log('CC', 'Set offset to ' + this.offset)
  }
}
