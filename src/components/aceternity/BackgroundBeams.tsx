import { cn } from '../../lib/utils'

export function BackgroundBeams({ className }: { className?: string }) {
  const paths = [
    'M-380 -189C-380 -189 -312 216 152 343C616 470 684 875 684 875',
    'M-373 -197C-373 -197 -305 208 159 335C623 462 691 867 691 867',
    'M-366 -205C-366 -205 -298 200 166 327C630 454 698 859 698 859',
    'M-359 -213C-359 -213 -291 192 173 319C637 446 705 851 705 851',
    'M-352 -221C-352 -221 -284 184 180 311C644 438 712 843 712 843',
    'M-345 -229C-345 -229 -277 176 187 303C651 430 719 835 719 835',
    'M-338 -237C-338 -237 -270 168 194 295C658 422 726 827 726 827',
    'M-331 -245C-331 -245 -263 160 201 287C665 414 733 819 733 819',
    'M-324 -253C-324 -253 -256 152 208 279C672 406 740 811 740 811',
    'M-317 -261C-317 -261 -249 144 215 271C679 398 747 803 747 803',
    'M-310 -269C-310 -269 -242 136 222 263C686 390 754 795 754 795',
    'M-303 -277C-303 -277 -235 128 229 255C693 382 761 787 761 787',
    'M-296 -285C-296 -285 -228 120 236 247C700 374 768 779 768 779',
    'M-289 -293C-289 -293 -221 112 243 239C707 366 775 771 775 771',
    'M-282 -301C-282 -301 -214 104 250 231C714 358 782 763 782 763',
  ]

  return (
    <div className={cn('absolute h-full w-full inset-0 [mask-size:40px] [mask-repeat:no-repeat] flex items-center justify-center', className)}>
      <svg
        className="z-0 h-full w-full pointer-events-none absolute"
        width="100%"
        height="100%"
        viewBox="0 0 696 316"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {paths.map((path, i) => (
          <path
            key={i}
            d={path}
            stroke={`url(#beam-gradient-${i})`}
            strokeOpacity="0.4"
            strokeWidth="0.5"
          />
        ))}
        <defs>
          {paths.map((_, i) => (
            <linearGradient key={i} id={`beam-gradient-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                from="-2 0"
                to="2 0"
                dur={`${2 + i * 0.3}s`}
                repeatCount="indefinite"
                additive="sum"
              />
            </linearGradient>
          ))}
        </defs>
      </svg>
    </div>
  )
}
