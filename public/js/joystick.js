// joystick estilo brawl
window.joystick = {
  dx: 0,
  dy: 0
}

const base = document.createElement("div")
const stick = document.createElement("div")

base.style.position = "fixed"
base.style.bottom = "20px"
base.style.left = "20px"
base.style.width = "120px"
base.style.height = "120px"
base.style.borderRadius = "50%"
base.style.background = "rgba(255,255,255,0.08)"
base.style.touchAction = "none"

stick.style.position = "absolute"
stick.style.left = "40px"
stick.style.top = "40px"
stick.style.width = "40px"
stick.style.height = "40px"
stick.style.borderRadius = "50%"
stick.style.background = "rgba(255,255,255,0.5)"

base.appendChild(stick)
document.body.appendChild(base)

let active = false
let startX = 0
let startY = 0

base.addEventListener("pointerdown", e => {
  active = true
  startX = e.clientX
  startY = e.clientY
})

window.addEventListener("pointerup", () => {
  active = false
  window.joystick.dx = 0
  window.joystick.dy = 0
  stick.style.left = "40px"
  stick.style.top = "40px"
})

window.addEventListener("pointermove", e => {
  if (!active) return

  let dx = e.clientX - startX
  let dy = e.clientY - startY

  const dist = Math.hypot(dx, dy)
  const max = 40

  if (dist > max) {
    dx = (dx / dist) * max
    dy = (dy / dist) * max
  }

  window.joystick.dx = dx / max
  window.joystick.dy = dy / max

  stick.style.left = 40 + dx + "px"
  stick.style.top = 40 + dy + "px"
})
