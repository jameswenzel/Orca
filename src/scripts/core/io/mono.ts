import { Client } from "../../client"

export type Event = {
  channel: number
  octave: number
  note: string
  velocity: number
  length: number
  isPlayed: boolean
}

export type Stack = {
  [key: number]: Event
}

export class Mono {
  stack: Event[]
  client: Client



  constructor(client: Client) {
    this.stack = [] // originally was {} with type Stack?
    this.client = client
  }


  public start() {
    console.info('MidiMono Starting..')
  }

  public clear() {

  }

  public run() {
    for (const id in this.stack) {
      if (this.stack[id].length < 1) {
        this.release(this.stack[id]/*, id*/)
      }
      if (!this.stack[id]) { continue }
      if (this.stack[id].isPlayed === false) {
        this.press(this.stack[id])
      }
      this.stack[id].length--
    }
  }

  public press(item: Event) {
    if (!item) { return }
    this.client.io.midi.trigger(item, true)
    item.isPlayed = true
  }

  public release(item: Event) {
    if (!item) { return }
    this.client.io.midi.trigger(item, false)
    delete this.stack[item.channel]
  }

  // TODO: bug??
  public silence() {
    for (const item of this.stack) {
      this.release(item)
    }
  }

  public push(channel: number, octave: number, note: string, velocity: number, length: number, isPlayed = false) {
    if (this.stack[channel]) {
      this.release(this.stack[channel])
    }
    this.stack[channel] = { channel, octave, note, velocity, length, isPlayed }
  }

  public length() {
    return Object.keys(this.stack).length
  }
}
