// src/core/utils/platform.js

import { Capacitor } from '@capacitor/core'

export const isNativePlatform = Capacitor.isNativePlatform()
export const isAndroid = Capacitor.getPlatform() === 'android'
export const isIOS = Capacitor.getPlatform() === 'ios'
export const isWeb = Capacitor.getPlatform() === 'web'