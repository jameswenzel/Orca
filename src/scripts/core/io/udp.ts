'use strict'
import dgram from 'dgram';
import { Client } from '../../client';


export class Udp  {
  stack: Array<any>
  port: number
  socket: dgram.Socket
  listener: dgram.Socket
  client: Client

  constructor(client) {
  this.stack = []
  this.port = null
  this.socket = dgram ? dgram.createSocket('udp4') : null
  this.listener = dgram ? dgram.createSocket('udp4') : null
  this.client = client
  }

  public start() {
    if (!dgram || !this.socket || !this.listener) { console.warn('UDP', 'Could not start.'); return }
    console.info('UDP', 'Starting..')

    this.selectInput()
    this.selectOutput()
  }

  public clear(){
    this.stack = []
  }

  public run(){
    for (const item of this.stack) {
      this.play(item)
    }
  }

  public push = function (msg) {
    this.stack.push(msg)
  }

  public play = function (data) {
    if (!this.socket) { return }
    this.socket.send(Buffer.from(`${data}`), this.port, this.client.io.ip, (err) => {
      if (err) { console.warn(err) }
    })
  }

  public selectOutput(port = 49161) {
    if (!dgram) { console.warn('UDP', 'Unavailable.'); return }
    if (parseInt(port as unknown as string) === this.port) { console.warn('UDP', 'Already selected'); return }
    if (isNaN(port) || port < 1000) { console.warn('UDP', 'Unavailable port'); return }

    console.log('UDP', `Output: ${port}`)
    this.port = parseInt(port as unknown as string)
  }

  public selectInput(port = 49160) {
    if (!dgram) { console.warn('UDP', 'Unavailable.'); return }
    if (this.listener) { this.listener.close() }

    console.log('UDP', `Input: ${port}`)
    this.listener = dgram.createSocket('udp4')

    this.listener.on('message', (msg, rinfo) => {
      this.client.commander.trigger(`${msg}`)
    })

    this.listener.on('listening', () => {
      const address = this.listener.address()
      console.info('UDP', `Started socket at ${address.address}:${address.port}`)
    })

    this.listener.on('error', (err) => {
      console.warn('UDP', `Server error:\n ${err.stack}`)
      this.listener.close()
    })

    this.listener.bind(port)
  }
}
