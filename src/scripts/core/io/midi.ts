'use strict'

import { Client } from "../../client";
import { Event } from "./mono";
import { transposeTable } from "../transpose";
import { clamp } from '../../lib/Util'

export class Midi {
  client: Client
  mode: number
  isClock: boolean
  outputIndex: number
  inputIndex: number
  outputs: Array<WebMidi.MIDIOutput>
  inputs: Array<WebMidi.MIDIInput>
  stack: Array<Event>
  ticks: Array<NodeJS.Timeout>


  constructor(client: Client) {
    this.client = client
    this.mode = 0
    this.isClock = false

    this.outputIndex = -1
    this.inputIndex = -1

    this.outputs = []
    this.inputs = []
    this.stack = []
    this.ticks = []


  }

  public receive(msg: WebMidi.MIDIMessageEvent) {
    switch (msg.data[0]) {
      // Clock
      case 0xF8:
        this.client.clock.tap()
        break
      case 0xFA:
        console.log('MIDI', 'Start Received')
        this.client.clock.play(false, true)
        break
      case 0xFB:
        console.log('MIDI', 'Continue Received')
        this.client.clock.play()
        break
      case 0xFC:
        console.log('MIDI', 'Stop Received')
        this.client.clock.stop()
        break
    }
  }

  public start() {
    console.info('Midi Starting..')
    this.refresh()
  }

  public clear() {
    this.stack = this.stack.filter((item) => { return item })
  }

  public run = () => {
    for (const id in this.stack) {
      const item = this.stack[id]
      if (item.isPlayed === false) {
        this.press(item)
      }
      if (item.length < 1) {
        this.release(item, +id)
      } else {
        item.length--
      }
    }
  }

  // Clock

  public sendClockStart() {
    if (!this.outputDevice()) { return }
    this.isClock = true
    this.outputDevice().send([0xFA], 0)
    console.log('MIDI', 'MIDI Start Sent')
  }

  public sendClockStop() {
    if (!this.outputDevice()) { return }
    this.isClock = false
    this.outputDevice().send([0xFC], 0)
    console.log('MIDI', 'MIDI Stop Sent')
  }

  public sendClock() {
    if (!this.outputDevice()) { return }
    if (this.isClock !== true) { return }

    const bpm = this.client.clock.speed.value
    const frameTime = (60000 / bpm) / 4
    const frameFrag = frameTime / 6

    for (let id = 0; id < 6; id++) {
      if (this.ticks[id]) { clearTimeout(this.ticks[id]) }
      this.ticks[id] = setTimeout(() => { this.outputDevice().send([0xF8], 0) }, parseInt(id as unknown as string) * frameFrag)
    }
  }

  public trigger(item: Event, down: boolean) {
    if (!this.outputDevice()) { console.warn('MIDI', 'No midi output!'); return }

    const transposed = this.transpose(item.note, item.octave)
    const channel = !isNaN(item.channel) ? parseInt(item.channel as unknown as string) : this.client.orca.valueOf(item.channel.toString())

    if (!transposed) { return }

    const c = down === true ? 0x90 + channel : 0x80 + channel
    const n = transposed.id
    const v = parseInt((item.velocity / 16) * 127 as unknown as string)

    if (!n || c === 127) { return }

    this.outputDevice().send([c, n, v])
  }

  public press(item: Event) {
    if (!item) { return }
    this.trigger(item, true)
    item.isPlayed = true
  }

  public release(item: Event, id: number) {
    if (!item) { return }
    this.trigger(item, false)
    delete this.stack[id]
  }

  // bug
  public silence() {
    this.stack.forEach((item, i) => {
      this.release(item, i)
    })
  }

  public push(channel: number, octave: number, note: string, velocity: number, length: number, isPlayed = false) {
    const item = { channel, octave, note, velocity, length, isPlayed }
    // Retrigger duplicates
    for (const id in this.stack) {
      const dup = this.stack[id]
      if (dup.channel === channel && dup.octave === octave && dup.note === note) { this.release(item, +id) }
    }
    this.stack.push(item)
  }

  public allNotesOff() {
    if (!this.outputDevice()) { return }
    console.log('MIDI', 'All Notes Off')
    for (let chan = 0; chan < 16; chan++) {
      this.outputDevice().send([0xB0 + chan, 123, 0])
    }
  }

  // Tools

  public selectOutput(id: number) {
    if (id === -1) { this.outputIndex = -1; console.log('MIDI', 'Select Output Device: None'); return }
    if (!this.outputs[id]) { console.warn('MIDI', `Unknown device with id ${id}`); return }

    this.outputIndex = Math.floor(+id)
    console.log('MIDI', `Select Output Device: ${this.outputDevice().name}`)
  }

  public selectInput(id: number) {
    if (this.inputDevice()) { this.inputDevice().onmidimessage = null }
    if (id === -1) { this.inputIndex = -1; console.log('MIDI', 'Select Input Device: None'); return }
    if (!this.inputs[id]) { console.warn('MIDI', `Unknown device with id ${id}`); return }

    this.inputIndex = Math.floor(+id)
    this.inputDevice().onmidimessage = (msg: WebMidi.MIDIMessageEvent) => { this.receive(msg) }
    console.log('MIDI', `Select Input Device: ${this.inputDevice().name}`)
  }

  public outputDevice() {
    return this.outputs[this.outputIndex]
  }

  public inputDevice() {
    return this.inputs[this.inputIndex]
  }

  // TODO: arrow?
  public selectNextOutput() {
    this.outputIndex = this.outputIndex < this.outputs.length ? this.outputIndex + 1 : 0
    this.client.update()
  }

  // TODO: arrow?
  public selectNextInput() {
    const id = this.inputIndex < this.inputs.length - 1 ? this.inputIndex + 1 : -1
    this.selectInput(id)
    this.client.update()
  }

  // Setup

  public refresh() {
    if (!navigator.requestMIDIAccess) { return }
    navigator.requestMIDIAccess().then(this.access, (err) => {
      console.warn('No Midi', err)
    })
  }

  public access(midiAccess: WebMidi.MIDIAccess) {
    const outputs = midiAccess.outputs.values()
    this.outputs = []
    for (let i = outputs.next(); i && !i.done; i = outputs.next()) {
      this.outputs.push(i.value)
    }
    this.selectOutput(0)

    const inputs = midiAccess.inputs.values()
    this.inputs = []
    for (let i = inputs.next(); i && !i.done; i = inputs.next()) {
      this.inputs.push(i.value)
    }
    this.selectInput(-1)
  }

  // UI

  public transpose(n: string, o = 3) {
    if (!transposeTable[n]) { return null }
    const octave = clamp(parseInt(o as unknown as string) + parseInt(transposeTable[n].charAt(1)), 0, 8)
    const note = transposeTable[n].charAt(0)
    const value = ['C', 'c', 'D', 'd', 'E', 'F', 'f', 'G', 'g', 'A', 'a', 'B'].indexOf(note)
    const id = clamp((octave * 12) + value + 24, 0, 127)
    return { id, value, note, octave }
  }

  public convert(id: number) {
    const note = ['C', 'c', 'D', 'd', 'E', 'F', 'f', 'G', 'g', 'A', 'a', 'B'][id % 12]
    const octave = Math.floor(id / 12) - 5
    const name = `${note}${octave}`
    const key = Object.values(transposeTable).indexOf(name)
    return Object.keys(transposeTable)[key]
  }

  public toString() {
    return !navigator.requestMIDIAccess ? 'No Midi Support' : this.outputDevice() ? `${this.outputDevice().name}` : 'No Midi Device'
  }
  // TODO: arrow?
  public toInputString() {
  return !navigator.requestMIDIAccess ? 'No Midi Support' : this.inputDevice() ? `${this.inputDevice().name}` : 'No Input Device'
}

  // TODO: arrow?
  public toOutputString() {
  return !navigator.requestMIDIAccess ? 'No Midi Support' : this.outputDevice() ? `${this.outputDevice().name}` : 'No Output Device'
}

  public length(){
  return this.stack.length
}

}
