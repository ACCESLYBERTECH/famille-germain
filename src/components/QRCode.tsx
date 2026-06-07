'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface Props {
  token: string
  size?: number
}

export default function QRCodeComponent({ token, size = 120 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, token, {
        width: size,
        margin: 1,
        color: {
          dark: '#1A2535',
          light: '#FFFFFF',
        },
      })
    }
  }, [token, size])

  return <canvas ref={canvasRef} className="rounded-lg" />
}