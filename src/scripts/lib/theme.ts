'use strict'

import { Client } from "../client"

type HasType = {
  type: string
}

type HasFiles = {
  files: Array<string>
}

type HasEventTargetWithFiles = {
  target: EventTarget & HasFiles
}

type ThemeProperties = {
  background: string
  f_high: string
  f_med: string
  f_low: string
  f_inv: string
  b_high: string
  b_med: string
  b_low: string
  b_inv: string
}

export class Theme {

  client: Client
  el: HTMLElement & HasType
  active: ThemeProperties
  default: ThemeProperties

  constructor(client: Client) {
    this.client = client
    this.el = document.createElement('style')
    this.el.type = 'text/css'

    this.default = {
      background: '#eeeeee',
      f_high: '#0a0a0a',
      f_med: '#4a4a4a',
      f_low: '#6a6a6a',
      f_inv: '#111111',
      b_high: '#a1a1a1',
      b_med: '#c1c1c1',
      b_low: '#ffffff',
      b_inv: '#ffb545'
    }
    this.active = {...this.default}
  }


  // Callbacks
  onLoad() { }

  public install = (host = document.body) => {
    window.addEventListener('dragover', this.drag)
    window.addEventListener('drop', this.drop)
    host.appendChild(this.el)
  }

  public start() {
    console.log('Theme', 'Starting..')
    if (this.isJson(localStorage.theme)) {
      const storage = JSON.parse(localStorage.theme)
      if (this.isValid(storage)) {
        console.log('Theme', 'Loading theme in localStorage..')
        this.load(storage)
        return
      }
    }
    this.load(this.default)
  }

  public open() {
    console.log('Theme', 'Open theme..')
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = (e) => {
      // does this conversion work?
      this.read((e as unknown as HasEventTargetWithFiles).target.files[0] as unknown as Blob, this.load)
    }
    input.click()
  }

  public load(data: string | Object) {
    const theme = this.parse(data as ThemeProperties)
    if (!this.isValid(theme)) { console.warn('Theme', 'Invalid format'); return }
    console.log('Theme', 'Loaded theme!')
    this.el.innerHTML = `:root { 
      --background: ${theme.background}; 
      --f_high: ${theme.f_high}; 
      --f_med: ${theme.f_med}; 
      --f_low: ${theme.f_low}; 
      --f_inv: ${theme.f_inv}; 
      --b_high: ${theme.b_high}; 
      --b_med: ${theme.b_med}; 
      --b_low: ${theme.b_low}; 
      --b_inv: ${theme.b_inv};
    }`
    localStorage.setItem('theme', JSON.stringify(theme))
    this.active = theme
    // if (this.onLoad) {
    //   this.onLoad(data)
    // }
  }

  public reset() {
    this.load(this.default)
  }

  public set (key: string, val: any) {
    if (!val) { return }
    const hex = (`${val}`.substr(0, 1) !== '#' ? '#' : '') + `${val}`
    if (!this.isColor(hex)) { console.warn('Theme', `${hex} is not a valid color.`); return }
    (this.active as {[key: string]: string})[key] = hex
  }

  // bug: duplicate
  // public read = (key) => {
  //   return this.active[key]
  // }

  public parse (any: ThemeProperties | string): ThemeProperties {
    if (this.isValid(any as ThemeProperties)) { return any as ThemeProperties }
    if (this.isJson(any as string)) { return JSON.parse(any as string) }
    if (this.isHtml(any as string)) { return this.extract(any as string) }
  }

  // Drag

  public drag (e: DragEvent) {
    e.stopPropagation()
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  public drop(e: DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file.name.indexOf('.svg') > -1) {
      this.read(file, this.load)
    }
    e.stopPropagation()
  }

  public read(file: Blob, callback: { (data: string | ArrayBuffer): void}) {
    const reader = new FileReader()
    reader.onload = (event) => {
      callback(event.target.result)
    }
    reader.readAsText(file, 'UTF-8')
  }

// Helpers

private extract(xml: string) {
  const svg = new DOMParser().parseFromString(xml, 'text/xml')
  try {
    return {
      background: svg.getElementById('background').getAttribute('fill'),
      f_high: svg.getElementById('f_high').getAttribute('fill'),
      f_med: svg.getElementById('f_med').getAttribute('fill'),
      f_low: svg.getElementById('f_low').getAttribute('fill'),
      f_inv: svg.getElementById('f_inv').getAttribute('fill'),
      b_high: svg.getElementById('b_high').getAttribute('fill'),
      b_med: svg.getElementById('b_med').getAttribute('fill'),
      b_low: svg.getElementById('b_low').getAttribute('fill'),
      b_inv: svg.getElementById('b_inv').getAttribute('fill')
    }
  } catch (err) {
    console.warn('Theme', 'Incomplete SVG Theme', err)
  }
}

private isValid(json: ThemeProperties) {
  if (!json) { return false }
  if (!json.background || !this.isColor(json.background)) { return false }
  if (!json.f_high || !this.isColor(json.f_high)) { return false }
  if (!json.f_med || !this.isColor(json.f_med)) { return false }
  if (!json.f_low || !this.isColor(json.f_low)) { return false }
  if (!json.f_inv || !this.isColor(json.f_inv)) { return false }
  if (!json.b_high || !this.isColor(json.b_high)) { return false }
  if (!json.b_med || !this.isColor(json.b_med)) { return false }
  if (!json.b_low || !this.isColor(json.b_low)) { return false }
  if (!json.b_inv || !this.isColor(json.b_inv)) { return false }
  return true
}

private isColor(hex: string) {
  return /^#([0-9A-F]{3}){1,2}$/i.test(hex)
}

private isJson(text: string) {
  try { JSON.parse(text); return true } catch (error) { return false }
}

private isHtml(text: string) {
  try { new DOMParser().parseFromString(text, 'text/xml'); return true } catch (error) { return false }
}
}
