'use strict'

import { Client } from "../client"


type HasFiles = {
  files: Array<File>
}


type HasEventTargetWithFiles = {
  target: EventTarget & HasFiles
}

export class Source {
  client: Client
  cache: Object

  constructor(client: Client) {
    this.client = client;
    this.cache = {}

  }

  public install() {
  }

  public start() {
    this.new()
  }

  public new() {
    console.log('Source', 'New file..')
    this.cache = {}
  }

  public open(ext, callback, store = false) {
    console.log('Source', 'Open file..')
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = (e) => {
      const file = (e as unknown as HasEventTargetWithFiles).target.files[0]
      if (file.name.indexOf('.' + ext) < 0) { console.warn('Source', `Skipped ${file.name}`); return }
      this.read(file, callback, store)
    }
    input.click()
  }

  public load(ext, callback?) {
    console.log('Source', 'Load files..')
    const input = document.createElement('input')
    input.type = 'file'
    input.setAttribute('multiple', 'multiple')
    input.onchange = (e) => {
      for (const file of (e as unknown as HasEventTargetWithFiles).target.files) {
        if (file.name.indexOf('.' + ext) < 0) { console.warn('Source', `Skipped ${file.name}`); continue }
        this.read(file, this.store)
      }
    }
    input.click()
  }

  public store(file, content) {
    console.info('Source', 'Stored ' + file.name)
    this.cache[file.name] = content
  }

  public save(name, content, type = 'text/plain', callback) {
    this.saveAs(name, 'orca', content, type, callback)
  }

  // bug
  public saveAs(name, ext, content, type = 'text/plain', callback) {
    console.log('Source', 'Save new file..')
    this.write(name, ext, content, type, callback)
  }

  // I/O

  public read(file, callback, store = false) {
    const reader = new FileReader()
    reader.onload = (event) => {
      const res = event.target.result
      if (callback) { callback(file, res) }
      if (store) { this.store(file, res) }
    }
    reader.readAsText(file, 'UTF-8')
  }

  public write(name, ext, content, type, settings = 'charset=utf-8') {
    const link = document.createElement('a')
    link.setAttribute('download', `${name}-${this.timestamp()}.${ext}`)
    if (type === 'image/png' || type === 'image/jpeg') {
      link.setAttribute('href', content)
    } else {
      link.setAttribute('href', 'data:' + type + ';' + settings + ',' + encodeURIComponent(content))
    }
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  }

  private timestamp(d = new Date(), e = new Date(d)) {
    return `${this.arvelie()}-${this.neralie()}`
  }

  private arvelie(date = new Date()) {
    const start = new Date(date.getFullYear(), 0, 0)
    // bug
    const diff = (date.getMilliseconds() - start.getMilliseconds()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000)
    const doty = Math.floor(diff / 86400000) - 1
    const y = date.getFullYear().toString().substr(2, 2)
    const m = doty === 364 || doty === 365 ? '+' : String.fromCharCode(97 + Math.floor(doty / 14)).toUpperCase()
    const d = `${(doty === 365 ? 1 : doty === 366 ? 2 : (doty % 14)) + 1}`.padStart(2, '0')
    return `${y}${m}${d}`
  }

  private neralie(d = new Date(), e = new Date(d)) {
    // bug
    const ms = e.getMilliseconds() - d.setHours(0, 0, 0, 0)
    return (ms / 8640 / 10000).toFixed(6).substr(2, 6)
  }
}
