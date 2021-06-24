'use strict'

import { MenuItemConstructorOptions } from "electron"
import { Pipe } from "stream"
import { Client } from "../client"
import { Commander } from "../commander"
import * as app from "./app"

type Accelerator = {
  cat: string,
  name: string,
  accelerator?: string
  downfn?: () => void
  upfn?: () => void
  role?: string
  type?: string
}

export class Acels {
  client: Client
  all: {[key: string]: Accelerator}
  // roles: {[key: string]: Accelerator}
  pipe: Commander

  constructor(client: Client) {
    this.client = client;
    this.all = {}
    // this.roles = {}
    this.pipe = null
  }


  public install(host = window) {
    host.addEventListener('keydown', this.onKeyDown, false)
    host.addEventListener('keyup', this.onKeyUp, false)
  }

  public set(cat: string, name: string, accelerator: string, downfn: () => void, upfn?: () => void) {
    if (this.all[accelerator]) { console.warn('Acels', `Trying to overwrite ${this.all[accelerator].name}, with ${name}.`) }
    this.all[accelerator] = { cat, name, downfn, upfn, accelerator }
  }

  public add(cat: string, role: string) {
    this.all[':' + role] = { cat, name: role, role }
  }

  public get(accelerator: string | number) {
    return this.all[accelerator]
  }

  public sort(): {[key: string]: Accelerator[]} {
    const h: {[key: string]: Accelerator[]} = {}
    for (const item of Object.values(this.all)) {
      if (!h[item.cat]) { h[item.cat] = [] }
      h[item.cat].push(item)
    }
    return h
  }

  public convert(event: KeyboardEvent) {
    const accelerator = event.key === ' ' ? 'Space' : event.key.substr(0, 1).toUpperCase() + event.key.substr(1)
    if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
      return `CmdOrCtrl+Shift+${accelerator}`
    }
    if (event.shiftKey && event.key.toUpperCase() !== event.key) {
      return `Shift+${accelerator}`
    }
    if (event.altKey && event.key.length !== 1) {
      return `Alt+${accelerator}`
    }
    if (event.ctrlKey || event.metaKey) {
      return `CmdOrCtrl+${accelerator}`
    }
    return accelerator
  }

  public setPipe(obj: Commander): void {
    this.pipe = obj
  }

  public onKeyDown(e: KeyboardEvent) {
    const target = this.get(this.convert(e))
    if (!target || !target.downfn) { return this.pipe ? this.pipe.onKeyDown(e) : null }
    target.downfn()
    e.preventDefault()
  }

  public onKeyUp(e: KeyboardEvent){
    const target = this.get(this.convert(e))
    if (!target || !target.upfn) { return this.pipe ? this.pipe.onKeyUp(e) : null }
    target.upfn()
    e.preventDefault()
  }

  public toMarkdown = () => {
    const cats = this.sort()
    let text = ''
    for (const cat in cats) {
      text += `\n### ${cat}\n\n`
      for (const item of cats[cat]) {
        text += item.accelerator ? `- \`${item.accelerator.replace('`', 'tilde')}\`: ${item.name}\n` : ''
      }
    }
    return text.trim()
  }

  public toString = () => {
    const cats = this.sort()
    let text = ''
    for (const cat in cats) {
      text += `\n${cat}\n\n`
      for (const item of cats[cat]) {
        text += item.accelerator ? `${item.name.padEnd(25, '.')} ${item.accelerator}\n` : ''
      }
    }
    return text.trim()
  }

  // Electron specifics

  public inject(name = 'Untitled') {
    const injection: Electron.MenuItemConstructorOptions[] = []

    injection.push({
      label: name,
      submenu: [
        { label: 'About', click: () => { require('electron').shell.openExternal('https://github.com/hundredrabbits/' + name) } },
        {
          label: 'Theme',
          submenu: [
            { label: 'Download Themes', click: () => { require('electron').shell.openExternal('https://github.com/hundredrabbits/Themes') } },
            { label: 'Open Theme', click: () => { this.client.theme.open() } },
            { label: 'Reset Theme', accelerator: 'CmdOrCtrl+Escape', click: () => { this.client.theme.reset() } }
          ]
        },
        { label: 'Fullscreen', accelerator: 'CmdOrCtrl+Enter', click: () => { app.toggleFullscreen() } },
        { label: 'Hide', accelerator: 'CmdOrCtrl+H', click: () => { app.toggleVisible() } },
        { label: 'Toggle Menubar', accelerator: 'Alt+H', click: () => { app.toggleMenubar() } },
        { label: 'Inspect', accelerator: 'CmdOrCtrl+Tab', click: () => { app.inspect() } },
        { role: 'quit' }
      ]
    })

    const sorted = this.sort()
    for (const cat of Object.keys(sorted)) {
      const submenu: MenuItemConstructorOptions[] = []
      for (const option of sorted[cat]) {
        if (option.role) {
          // @ts-ignore
          submenu.push({ role: option.role })
        } else if (option.type) {
          // @ts-ignore
          submenu.push({ type: option.type })
        } else {
          submenu.push({ label: option.name, accelerator: option.accelerator, click: option.downfn })
        }
      }
      injection.push({ label: cat, submenu: submenu })
    }
    app.injectMenu(injection)
  }
}
