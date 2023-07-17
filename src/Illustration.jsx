import Zdog from 'zdog'
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { useMeasure, useZdogPrimitive, stateContext } from './hooks'
import { applyProps } from './utils'

export const Illustration = React.memo(
  ({
    children,
    style,
    resize,
    element: Element = 'svg',
    frameloop = 'always',
    dragRotate,
    onDragMove = () => {},
    ...rest
  }) => {
    const canvas = useRef()

    //ref to secondary canvas and 2d context
    const canvas_ghost = useRef()

    const [bind, size] = useMeasure()
    const [result, scene, ghostScene] = useZdogPrimitive(Zdog.Anchor, children)

    const state = useRef({
      scene,
      illu: undefined,
      size: {},
      subscribers: [],
      subscribe: fn => {
        state.current.subscribers.push(fn)
        return () => (state.current.subscribers = state.current.subscribers.filter(s => s !== fn))
      },
      illu_ghost: undefined,
      itemMap: {},
    })

    useEffect(() => {
      state.current.size = size
      if (state.current.illu) {
        state.current.illu.setSize(size.width, size.height)
        state.current.illu_ghost.setSize(size.width, size.height)
        if (frameloop === 'demand') {
          state.current.illu.updateRenderGraph()
          state.current.illu_ghost.updateRenderGraph()
        }
      }
    }, [size])

    useEffect(() => {
      state.current.illu = new Zdog.Illustration({
        element: canvas.current,
        dragRotate,
        onDragMove: () => {
          state.current.illu_ghost.rotate = {
            x: state.current.illu.rotate.x,
            y: state.current.illu.rotate.y,
            z: state.current.illu.rotate.z,
          }
          // state.current.illu_ghost.updateRenderGraph()
          onDragMove()
        },
        ...rest,
      })
      state.current.illu.addChild(scene)
      state.current.illu.updateGraph()

      state.current.illu_ghost = new Zdog.Illustration({
        element: canvas_ghost.current,
        ...rest,
      })
      state.current.illu_ghost.addChild(ghostScene)
      state.current.illu_ghost.updateGraph()

      let frame
      let active = true
      function render(t) {
        const { size, subscribers } = state.current
        if (size.width && size.height) {
          // Run local effects
          subscribers.forEach(fn => fn(t))
          // Render scene
          if (frameloop !== 'demand') {
            state.current.illu.updateRenderGraph()
            state.current.illu_ghost.updateRenderGraph()
          }
        }
        if (active && frameloop !== 'demand') frame = requestAnimationFrame(render)
      }

      // Start render loop
      render()

      return () => {
        // Take no chances, the loop has got to stop if the component unmounts
        active = false
        cancelAnimationFrame(frame)
      }
    }, [frameloop])

    // Takes care of updating the main illustration
    useLayoutEffect(() => {
      state.current.illu && applyProps(state.current.illu, rest)
      state.current.illu_ghost && applyProps(state.current.illu_ghost, rest)
    }, [rest])

    return (
      <>
        <div
          ref={bind.ref}
          {...rest}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            boxSizing: 'border-box',
            ...style,
          }}>
          <Element
            ref={canvas}
            style={{ display: 'block', boxSizing: 'border-box' }}
            width={size.width}
            height={size.height}
          />
          {state.current.illu && <stateContext.Provider value={state} children={result} />}
        </div>
        <canvas
          ref={canvas_ghost}
          style={{
            display: 'block',
            boxSizing: 'border-box',
            // opacity: '0',
            position: 'fixed',
            top: '-40%',
            left: '-40%',
            zIndex: '1000',
            pointerEvents: 'none',
            transform: 'scale(0.2)',
            background: 'black',
          }}
          width={size.width}
          height={size.height}
        />
      </>
    )
  }
)