# UI Component Library Research

Exhaustive catalog of animation/effect-heavy component libraries.

---

## 1. Aceternity UI (https://ui.aceternity.com)

### 3D Card Effect
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| (CardContainer) className | string | - | CSS classes for container |
| (CardContainer) containerClassName | string | - | CSS classes for outer wrapper |
| (CardBody) className | string | - | CSS classes for card body |
| (CardItem) as | React.ElementType | "div" | HTML tag to render |
| (CardItem) translateX | number/string | - | Horizontal 3D translation |
| (CardItem) translateY | number/string | - | Vertical 3D translation |
| (CardItem) translateZ | number/string | - | Depth 3D translation |
| (CardItem) rotateX | number/string | - | X-axis rotation |
| (CardItem) rotateY | number/string | - | Y-axis rotation |
| (CardItem) rotateZ | number/string | - | Z-axis rotation |
**Sub-components:** CardContainer, CardBody, CardItem
**Features:** CSS perspective 3D effects, hover-triggered elevation, independent element transforms, dark mode
**Libraries:** Aceternity UI

### Animated Modal
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| (ModalTrigger) className | string | - | CSS classes for trigger |
| (ModalContent) className | string | - | CSS classes for content |
| (ModalFooter) className | string | - | CSS classes for footer |
**Sub-components:** ModalProvider, Modal, ModalTrigger, ModalBody, ModalContent, ModalFooter, Overlay
**Features:** Framer Motion animations, portal overlay, dark mode, responsive
**Libraries:** Aceternity UI

### Animated Tooltip
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| items | Array<{id: number, name: string, designation: string, image: string}> | required | Tooltip item data |
**Sub-components:** None
**Features:** Mouse pointer tracking, avatar display, smooth animations
**Libraries:** Aceternity UI

### Aurora Background
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | - | Content within background |
| className | string | - | CSS classes |
| showRadialGradient | boolean | true | Enable radial gradient |
**Sub-components:** None
**Features:** Northern lights animated background, radial gradient overlay
**Libraries:** Aceternity UI

### Background Beams
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Animated SVG path beams, hero section background
**Libraries:** Aceternity UI

### Background Beams With Collision
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Content |
| className | string | - | CSS classes |
| (beamOptions) initialX | number | 0 | Starting X position |
| (beamOptions) translateX | number | 0 | X translation destination |
| (beamOptions) initialY | number | "-200px" | Starting Y position |
| (beamOptions) translateY | number | "1800px" | Y translation destination |
| (beamOptions) rotate | number | 0 | Rotation angle |
| (beamOptions) duration | number | 8 | Animation duration (seconds) |
| (beamOptions) delay | number | 0 | Animation delay |
| (beamOptions) repeatDelay | number | 0 | Repeat cycle delay |
**Sub-components:** CollisionMechanism
**Features:** Animated beams with collision detection
**Libraries:** Aceternity UI

### Background Boxes
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
**Sub-components:** None (Boxes component)
**Features:** Full-width background grid, hover highlight effect
**Libraries:** Aceternity UI

### Background Gradient
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | - | Content |
| className | string | - | Inner div classes |
| containerClassName | string | - | Outer div classes |
| animate | boolean | true | Enable gradient animation |
**Sub-components:** None
**Features:** Animated gradient background for cards/buttons
**Libraries:** Aceternity UI

### Background Ripple Effect
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| rows | number | 8 | Grid rows |
| cols | number | 27 | Grid columns |
| cellSize | number | 56 | Cell pixel size |
| (DivGrid) borderColor | string | - | Cell border color |
| (DivGrid) fillColor | string | - | Cell fill color |
| (DivGrid) interactive | boolean | false | Enable mouse interaction |
**Sub-components:** DivGrid
**Features:** Interactive grid ripple on click, configurable grid
**Libraries:** Aceternity UI

### Card Spotlight
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Card content |
| radius | number | 350 | Spotlight radius in px |
| color | string | "#262626" | Spotlight color |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Interactive radial gradient spotlight on hover
**Libraries:** Aceternity UI

### Compare
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| firstImage | string | "" | First image URL |
| secondImage | string | "" | Second image URL |
| className | string | - | Container classes |
| firstImageClassName | string | - | First image classes |
| secondImageClassname | string | - | Second image classes |
| initialSliderPercentage | number | 50 | Starting slider position |
| slideMode | "hover" / "drag" | "hover" | Interaction mode |
| showHandlebar | boolean | true | Show slider handle |
| autoplay | boolean | false | Auto sliding |
| autoplayDuration | number | 5000 | Autoplay cycle (ms) |
**Sub-components:** None
**Features:** Image comparison slider, hover/drag modes, autoplay
**Libraries:** Aceternity UI

### Container Scroll Animation
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| titleComponent | string/ReactNode | - | Title content |
| children | ReactNode | - | Scroll content |
**Sub-components:** Header, Card
**Features:** Scroll-triggered rotation, translation, opacity animations
**Libraries:** Aceternity UI

### Direction Aware Hover
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| imageUrl | string | required | Image URL |
| children | ReactNode/string | required | Overlay content |
| childrenClassName | string | - | Children CSS classes |
| imageClassName | string | - | Image CSS classes |
**Sub-components:** None
**Features:** Hover effect responding to entry direction
**Libraries:** Aceternity UI

### Evervault Card
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
| title | string | - | Card text |
**Sub-components:** None
**Features:** Encrypted text reveal on hover, gradient effect
**Libraries:** Aceternity UI

### Expandable Cards
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| (card) title | string | - | Card heading |
| (card) description | string | - | Subtitle |
| (card) src | string | - | Image URL |
| (card) ctaText | string | - | Button label |
| (card) ctaLink | string | - | Button URL |
| (card) content | ReactNode | - | Expanded content |
**Sub-components:** None (uses useOutsideClick hook)
**Features:** Modal overlay, layout animations, keyboard escape, click-outside
**Libraries:** Aceternity UI

### File Upload
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| onChange | (files: File[]) => void | - | Upload callback |
**Sub-components:** None
**Features:** Drag-and-drop, micro interactions, grid background
**Libraries:** Aceternity UI

### Flip Words
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| words | string[] | required | Words to cycle |
| duration | number | 3000 | Display time per word (ms) |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Word cycling with flip animation
**Libraries:** Aceternity UI

### Floating Dock
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| items | Array<{title: string, icon: ReactNode, href: string}> | required | Dock items |
| desktopClassName | string | - | Desktop CSS classes |
| mobileClassName | string | - | Mobile CSS classes |
**Sub-components:** FloatingDockMobile, FloatingDockDesktop, IconContainer
**Features:** macOS-style dock, responsive mobile/desktop variants, hover magnification
**Libraries:** Aceternity UI

### Floating Navbar
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
| navItems | Array<{name: string, link: string, icon: ReactNode}> | required | Navigation items |
**Sub-components:** None
**Features:** Auto-hide on scroll down, reveal on scroll up
**Libraries:** Aceternity UI

### Focus Cards
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| cards | Array<{title: string, src: string}> | required | Card data |
**Sub-components:** Card (internal)
**Features:** Hover to focus card, blur other cards
**Libraries:** Aceternity UI

### Following Pointer
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Content |
| className | string | - | CSS classes |
| title | string/ReactNode | - | Pointer display text |
**Sub-components:** FollowerPointerCard
**Features:** Custom cursor follows mouse with animated content
**Libraries:** Aceternity UI

### Glowing Effect
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| blur | number | 0 | Blur pixels |
| inactiveZone | number | 0.7 | Center zone radius (0-1) |
| proximity | number | 0 | Distance beyond bounds |
| spread | number | 20 | Angular spread (degrees) |
| variant | "default"/"white" | "default" | Color variant |
| glow | boolean | false | Force visible |
| className | string | - | CSS classes |
| disabled | boolean | true | Disable effect |
| movementDuration | number | 2 | Movement animation (seconds) |
| borderWidth | number | 1 | Border width (px) |
**Sub-components:** None
**Features:** Interactive border glow, multi-color gradient, hover activation
**Libraries:** Aceternity UI

### Google Gemini Effect
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| pathLengths | MotionValue[] | required | SVG path animation values |
| title | string | - | Display title |
| description | string | - | Display description |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Scroll-triggered SVG path animations
**Libraries:** Aceternity UI

### Hero Highlight
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| (HeroHighlight) children | ReactNode | - | Content |
| (HeroHighlight) className | string | - | Content classes |
| (HeroHighlight) containerClassName | string | - | Container classes |
| (Highlight) children | ReactNode | - | Text to highlight |
| (Highlight) className | string | - | Highlight classes |
**Sub-components:** HeroHighlight, Highlight
**Features:** Background dot effect with text highlight animation
**Libraries:** Aceternity UI

### Hero Parallax
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| products | Array<{title: string, link: string, thumbnail: string}> | required | Product data |
**Sub-components:** ProductCard
**Features:** Scroll parallax with rotation, translation, opacity
**Libraries:** Aceternity UI

### Hover Border Gradient
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Content |
| containerClassName | string | - | Container classes |
| className | string | - | Inner classes |
| as | React.ElementType | "button" | Element type |
| duration | number | 1 | Animation cycle (seconds) |
| clockwise | boolean | true | Gradient direction |
**Sub-components:** None
**Features:** Animated rotating gradient border on hover
**Libraries:** Aceternity UI

### Images Slider
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| images | string[] | required | Image URLs |
| children | ReactNode | - | Overlay content |
| overlay | ReactNode | true | Show overlay |
| overlayClassName | string | - | Overlay classes |
| className | string | - | Slider classes |
| autoplay | boolean | true | Auto-advance |
| direction | "up"/"down" | "up" | Transition direction |
**Sub-components:** None
**Features:** Full-page image carousel, keyboard navigation
**Libraries:** Aceternity UI

### Infinite Moving Cards
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| items | Array<{quote: string, name: string, title: string}> | required | Card data |
| direction | "left"/"right" | "left" | Scroll direction |
| speed | "fast"/"normal"/"slow" | "fast" | Animation speed |
| pauseOnHover | boolean | true | Pause on hover |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Continuous scrolling testimonial cards
**Libraries:** Aceternity UI

### Lamp Section Header
**Props:** className only (visual section effect)
**Sub-components:** LampContainer
**Features:** Animated lamp/glow effect for section headers
**Libraries:** Aceternity UI

### Layout Grid
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| cards | Array<{id: number, content: ReactNode, className: string, thumbnail: string}> | required | Card data |
**Sub-components:** None
**Features:** Click-to-expand grid cards with layout animations
**Libraries:** Aceternity UI

### Lens
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Content to magnify |
| zoomFactor | number | 1.5 | Magnification level |
| lensSize | number | 170 | Lens diameter (px) |
| position | {x: number, y: number} | {x:200, y:150} | Static position |
| isStatic | boolean | false | Fixed position mode |
| hovering | boolean | - | External hover state |
| setHovering | (boolean) => void | - | Hover state setter |
**Sub-components:** None
**Features:** Magnifying lens following mouse, static or dynamic
**Libraries:** Aceternity UI, Magic UI

### Link Preview
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Link content |
| url | string | required | Preview URL |
| className | string | - | CSS classes |
| width | number | 200 | Preview width (px) |
| height | number | 125 | Preview height (px) |
| quality | number | 50 | Image quality |
| layout | string | "fixed" | Image layout |
| isStatic | boolean | false | Static vs dynamic preview |
| imageSrc | string | "" | Static image source |
**Sub-components:** None
**Features:** Hover preview of linked pages via Microlink API
**Libraries:** Aceternity UI

### Meteor Effect
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
| number | number | - | Meteor count |
**Sub-components:** None
**Features:** Background meteor shower animation
**Libraries:** Aceternity UI

### Moving Border
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| borderRadius | string | "1.75rem" | Border radius |
| children | ReactNode | required | Content |
| as | any | "button" | Element type |
| containerClassName | string | - | Container classes |
| borderClassName | string | - | Border classes |
| duration | number | 2000 | Animation duration (ms) |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Animated border movement around container
**Libraries:** Aceternity UI

### Multi Step Loader
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| loadingStates | Array<{text: string}> | required | Loading messages |
| loading | boolean | - | Active state |
| duration | number | 2000 | Time per state (ms) |
| loop | boolean | true | Loop states |
**Sub-components:** LoaderCore
**Features:** Sequential loading state transitions
**Libraries:** Aceternity UI

### Navbar Menu
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
**Sub-components:** Menu, MenuItem, HoveredLink, ProductItem
**Features:** Animated hover navigation with dropdown content
**Libraries:** Aceternity UI

### Parallax Grid Scroll
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
| images | string[] | required | Image URLs |
**Sub-components:** None
**Features:** Two-column grid with opposing scroll directions
**Libraries:** Aceternity UI

### Placeholders And Vanish Input
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| placeholders | string[] | required | Cycling placeholder texts |
| onChange | (e) => void | required | Input change handler |
| onSubmit | (e) => void | required | Form submit handler |
**Sub-components:** None
**Features:** Cycling placeholder text, vanish animation on submit
**Libraries:** Aceternity UI

### Shooting Stars and Stars Background
**Props (ShootingStars):**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| minSpeed | number | 10 | Min shooting star speed |
| maxSpeed | number | 30 | Max shooting star speed |
| minDelay | number | 4200 | Min delay between stars (ms) |
| maxDelay | number | 8700 | Max delay (ms) |
| starColor | string | "#9E00FF" | Star color |
| trailColor | string | "#2EB9DF" | Trail color |
| starWidth | number | 10 | Star width |
| starHeight | number | 1 | Star height |
| className | string | - | CSS classes |
**Props (StarsBackground):**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| starDensity | number | 0.00015 | Stars per pixel area |
| allStarsTwinkle | boolean | true | All stars twinkle |
| twinkleProbability | number | 0.7 | Twinkle probability (0-1) |
| minTwinkleSpeed | number | 0.5 | Min twinkle duration (s) |
| maxTwinkleSpeed | number | 1 | Max twinkle duration (s) |
| className | string | - | CSS classes |
**Sub-components:** ShootingStars, StarsBackground
**Features:** Animated star field with configurable shooting stars
**Libraries:** Aceternity UI

### Sidebar
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | - | Content |
| open | boolean | false | Open state |
| setOpen | Dispatch<SetStateAction<boolean>> | - | State setter |
| animate | boolean | true | Enable animation |
**Sub-components:** SidebarProvider, SidebarBody, DesktopSidebar, MobileSidebar, SidebarLink
**Features:** Responsive sidebar, mobile/desktop variants, animated expand/collapse
**Libraries:** Aceternity UI

### Sparkles
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| id | string | - | Instance identifier |
| className | string | - | CSS classes |
| background | string | - | Background color |
| particleSize | number | - | Particle size |
| minSize | number | - | Min particle size |
| maxSize | number | - | Max particle size |
| speed | number | - | Animation speed |
| particleColor | string | - | Particle color |
| particleDensity | number | - | Particle count |
**Sub-components:** SparklesCore (internal)
**Features:** Canvas-based particle system, configurable density/color/speed
**Libraries:** Aceternity UI

### Spotlight
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
| fill | string | - | Spotlight color (hex) |
**Sub-components:** None
**Features:** Animated spotlight effect for hero sections
**Libraries:** Aceternity UI

### Sticky Scroll Reveal
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| content | Array<{title: string, description: string, content: ReactNode}> | required | Section data |
| contentClassName | string | - | Right side container classes |
**Sub-components:** None
**Features:** Scroll-triggered content reveal with sticky positioning
**Libraries:** Aceternity UI

### SVG Mask Effect
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
| children | string/ReactNode | - | Static content |
| revealText | string/ReactNode | - | Content revealed on hover |
| size | number | - | Initial mask size |
| revealSize | number | - | Expanded mask size on hover |
**Sub-components:** None
**Features:** SVG mask reveal on hover
**Libraries:** Aceternity UI

### Animated Tabs
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| tabs | Array<{title: string, value: string, content: ReactNode}> | required | Tab data |
| containerClassName | string | - | Container classes |
| activeTabClassName | string | - | Active tab classes |
| tabClassName | string | - | Tab classes |
| contentClassName | string | - | Content classes |
**Sub-components:** Tabs, FadeInDiv
**Features:** Animated background transition between tabs
**Libraries:** Aceternity UI

### Text Generate Effect
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| words | string | required | Text to animate |
| duration | number | - | Animation duration |
| filter | boolean | - | Apply filter effect |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Sequential word-by-word fade-in on page load
**Libraries:** Aceternity UI

### Text Reveal Card
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
| text | string | - | Visible text |
| revealText | string | - | Hidden text revealed on hover |
| children | ReactNode | - | Card title/description |
**Sub-components:** None
**Features:** Mouse-tracked text reveal on hover
**Libraries:** Aceternity UI

### Timeline
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| data | Array<{title: string, content: ReactNode}> | required | Timeline entries |
**Sub-components:** None
**Features:** Vertical timeline with scroll animations
**Libraries:** Aceternity UI

### Tracing Beam
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
| children | ReactNode | - | Content |
**Sub-components:** None
**Features:** SVG beam following scroll path, adjusts with scroll speed
**Libraries:** Aceternity UI

### Typewriter Effect
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | Container classes |
| words | Array<{text: string, className: string}> | required | Word objects |
| cursorClassName | string | - | Cursor classes |
**Sub-components:** TypewriterEffectSmooth (variant)
**Features:** Typing animation with cursor, per-word styling
**Libraries:** Aceternity UI

### Animated Testimonials
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| testimonials | Array<{quote: string, name: string, designation: string, src: string}> | required | Testimonial data |
| autoplay | boolean | false | Auto-cycle testimonials |
**Sub-components:** None
**Features:** Rotating testimonials with image transitions
**Libraries:** Aceternity UI

### Apple Cards Carousel
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| (Carousel) items | JSX.Element[] | required | Carousel items |
| (Carousel) initialScroll | number | 0 | Starting scroll position |
| (Card) card | {src: string, title: string, category: string, content: ReactNode} | required | Card data |
| (Card) index | number | required | Card position |
| (Card) layout | boolean | false | Enable layout animations |
**Sub-components:** Carousel, Card, BlurImage
**Features:** Apple-style carousel with expandable cards
**Libraries:** Aceternity UI

### Vortex Background
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | any | - | Content |
| className | string | - | Children wrapper classes |
| containerClassName | string | - | Container classes |
| particleCount | number | 700 | Number of particles |
| rangeY | number | 100 | Vertical range |
| baseHue | number | 220 | Base hue color |
| baseSpeed | number | 0.0 | Base speed |
| rangeSpeed | number | 1.5 | Speed variation |
| baseRadius | number | 1 | Base particle radius |
| rangeRadius | number | 2 | Radius variation |
| backgroundColor | string | "#000000" | Canvas background |
**Sub-components:** None
**Features:** Canvas-based swirling vortex particle effect
**Libraries:** Aceternity UI

### Wavy Background
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | any | - | Content |
| className | string | - | Content container classes |
| containerClassName | string | - | Main container classes |
| colors | string[] | ["#38bdf8","#818cf8","#c084fc","#e879f9","#22d3ee"] | Wave colors |
| waveWidth | number | 50 | Wave width |
| backgroundFill | string | "black" | Background color |
| blur | number | 10 | Blur effect |
| speed | "slow"/"fast" | "fast" | Wave speed |
| waveOpacity | number | 0.5 | Wave opacity |
**Sub-components:** None
**Features:** Animated canvas wave background
**Libraries:** Aceternity UI

### Wobble Card
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Content |
| containerClassName | string | - | Container classes |
| className | string | - | Children wrapper classes |
**Sub-components:** None
**Features:** Translate and scale on mousemove
**Libraries:** Aceternity UI

### World Map
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| dots | Array<{start: {lat,lng}, end: {lat,lng}}> | required | Connection points |
| lineColor | string | - | Line color |
**Sub-components:** None
**Features:** Animated connection lines and dots on world map
**Libraries:** Aceternity UI

### 3D Animated Pin
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
| containerClassName | string | - | Container classes |
| title | string/ReactNode | - | Hover display text |
| href | string | - | Click URL |
| children | ReactNode | - | Pin content |
**Sub-components:** PinContainer
**Features:** 3D hover animation, gradient pin effect
**Libraries:** Aceternity UI

### 3D Marquee
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| images | string[] | required | Image URLs |
| className | string | - | Container classes |
**Sub-components:** GridLineHorizontal, GridLineVertical
**Features:** 3D perspective marquee of images in 4 columns
**Libraries:** Aceternity UI

---

## 2. Magic UI (https://magicui.design)

### Animated Beam
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | SVG element classes |
| containerRef | RefObject<HTMLElement> | required | Parent container ref |
| fromRef | RefObject<HTMLElement> | required | Start element ref |
| toRef | RefObject<HTMLElement> | required | End element ref |
| curvature | number | 0 | Curve bend amount |
| reverse | boolean | false | Reverse gradient direction |
| pathColor | string | "gray" | Static path color |
| pathWidth | number | 2 | Stroke width (px) |
| pathOpacity | number | 0.2 | Path opacity |
| gradientStartColor | string | "#ffaa40" | Gradient start |
| gradientStopColor | string | "#9c40ff" | Gradient end |
| delay | number | 0 | Animation delay (s) |
| duration | number | random(4-7) | Animation duration (s) |
| startXOffset | number | 0 | Source X offset |
| startYOffset | number | 0 | Source Y offset |
| endXOffset | number | 0 | Target X offset |
| endYOffset | number | 0 | Target Y offset |
**Sub-components:** None
**Features:** Animated SVG beam between two elements with gradient
**Libraries:** Magic UI

### Animated Circular Progress Bar
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| max | number | 100 | Maximum value |
| min | number | 0 | Minimum value |
| value | number | 0 | Current value |
| gaugePrimaryColor | string | required | Filled arc color |
| gaugeSecondaryColor | string | required | Remaining arc color |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Circular SVG progress indicator
**Libraries:** Magic UI

### Animated Gradient Text
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | - | Content |
| className | string | - | CSS classes |
| speed | number | 1 | Animation speed multiplier |
| colorFrom | string | "#ffaa40" | Gradient start color |
| colorTo | string | "#9c40ff" | Gradient end color |
**Sub-components:** None
**Features:** CSS gradient text with animated background
**Libraries:** Magic UI

### Animated Grid Pattern
**Props:** className, width, height, x, y, strokeDasharray, squares (same as GridPattern with animation)
**Features:** Grid pattern with animated square highlights
**Libraries:** Magic UI

### Animated List
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | List items |
| delay | number | 1000 | Delay between items (ms) |
| className | string | - | CSS classes |
**Sub-components:** AnimatedListItem
**Features:** Sequential item appearance animation
**Libraries:** Magic UI

### Animated Shiny Text
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| shimmerWidth | number | 100 | Shimmer width (px) |
| children | ReactNode | - | Content |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Continuous shimmer/shine effect across text
**Libraries:** Magic UI

### Aurora Text
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Content |
| className | string | "" | CSS classes |
| colors | string[] | ["#FF0080","#7928CA","#0070F3","#38bdf8"] | Gradient colors |
| speed | number | 1 | Animation speed multiplier |
**Sub-components:** None
**Features:** Animated aurora gradient text effect
**Libraries:** Magic UI

### Avatar Circles
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
| numPeople | number | - | Additional people count badge |
| avatarUrls | Array<{imageUrl: string, profileUrl: string}> | required | Avatar data |
**Sub-components:** None
**Features:** Overlapping avatar circles with count badge
**Libraries:** Magic UI

### Bento Grid
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| (BentoGrid) children | ReactNode | required | Grid content |
| (BentoGrid) className | string | - | CSS classes |
| (BentoCard) name | string | required | Card title |
| (BentoCard) className | string | required | Card classes |
| (BentoCard) background | ReactNode | required | Background element |
| (BentoCard) Icon | React.ElementType | required | Icon component |
| (BentoCard) description | string | required | Description text |
| (BentoCard) href | string | required | Link URL |
| (BentoCard) cta | string | required | CTA text |
**Sub-components:** BentoGrid, BentoCard
**Features:** 3-column responsive grid with hover animations
**Libraries:** Magic UI

### Blur Fade
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Content |
| className | string | - | CSS classes |
| variant | object | - | Custom animation states |
| duration | number | 0.4 | Duration (s) |
| delay | number | 0 | Delay (s) |
| offset | number | 6 | Position displacement (px) |
| direction | "up"/"down"/"left"/"right" | "down" | Entry direction |
| inView | boolean | false | Trigger on viewport entry |
| inViewMargin | string | "-50px" | Viewport margin |
| blur | string | "6px" | Initial blur |
**Sub-components:** None
**Features:** Entrance animation with blur and fade
**Libraries:** Magic UI

### Border Beam
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| size | number | 50 | Beam size |
| duration | number | 6 | Animation duration |
| delay | number | 0 | Animation delay |
| colorFrom | string | "#ffaa40" | Start color |
| colorTo | string | "#9c40ff" | End color |
| transition | Transition | - | Motion transition |
| className | string | - | CSS classes |
| style | CSSProperties | - | Inline styles |
| reverse | boolean | false | Reverse direction |
| initialOffset | number | 0 | Initial position (0-100) |
| borderWidth | number | 1 | Border width |
**Sub-components:** None
**Features:** Animated border beam effect
**Libraries:** Magic UI

### Code Comparison
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| beforeCode | string | required | Original code |
| afterCode | string | required | Modified code |
| language | string | required | Code language |
| filename | string | required | File name |
| lightTheme | string | required | Light mode theme |
| darkTheme | string | required | Dark mode theme |
| highlightColor | string | "#ff3333" | Highlight color |
**Sub-components:** None
**Features:** Side-by-side code comparison with syntax highlighting
**Libraries:** Magic UI

### Confetti
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| options | ConfettiOptions | - | Animation settings |
| globalOptions | ConfettiGlobalOptions | {resize:true, useWorker:true} | Canvas settings |
| manualstart | boolean | false | Prevent auto-start |
| children | ReactNode | - | Content |
**Sub-components:** ConfettiButton
**Features:** Canvas confetti animation, imperative API via ref
**Libraries:** Magic UI

### Cool Mode
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Content |
| (options) particle | string | "circle" | Particle type/emoji/URL |
| (options) size | number | random | Particle size (px) |
| (options) particleCount | number | 45 | Max particles |
| (options) speedHorz | number | random*10 | Horizontal speed |
| (options) speedUp | number | random*25 | Upward speed |
**Sub-components:** None
**Features:** Click to spawn particles (circles, emojis, or images)
**Libraries:** Magic UI

### Dock
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
| iconSize | number | 40 | Base icon size |
| iconMagnification | number | 60 | Enlarged size on hover |
| disableMagnification | boolean | false | Disable magnification |
| iconDistance | number | 140 | Magnification range (px) |
| direction | "top"/"middle"/"bottom" | "middle" | Vertical alignment |
**Sub-components:** DockIcon
**Features:** macOS-style dock with magnification, spring physics
**Libraries:** Magic UI, Motion Primitives

### Dot Pattern
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| width | number | 16 | Horizontal spacing |
| height | number | 16 | Vertical spacing |
| x | number | 0 | Pattern X offset |
| y | number | 0 | Pattern Y offset |
| cx | number | 1 | Dot X offset |
| cy | number | 1 | Dot Y offset |
| cr | number | 1 | Dot radius |
| className | string | - | CSS classes |
| glow | boolean | false | Enable glow animation |
**Sub-components:** None
**Features:** SVG dot pattern background, optional glow
**Libraries:** Magic UI

### Dotted Map
**Props:** className, dots (geographic coordinate data)
**Features:** Interactive dotted world map
**Libraries:** Magic UI

### File Tree
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| initialSelectedId | string | - | Initial selected item |
| indicator | boolean | true | Show indicator |
| elements | TreeViewElement[] | - | Tree data |
| initialExpandedItems | string[] | - | Initially expanded IDs |
| openIcon | ReactNode | - | Open folder icon |
| closeIcon | ReactNode | - | Closed folder icon |
| sort | "default"/"none"/comparator | "default" | Sort mode |
| dir | "rtl"/"ltr" | - | Text direction |
**Sub-components:** Tree, Folder, File, TreeIndicator, CollapseButton
**Features:** Collapsible file tree with selection, sort, RTL support
**Libraries:** Magic UI

### Flickering Grid
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| squareSize | number | 4 | Square pixel size |
| gridGap | number | 6 | Gap between squares (px) |
| flickerChance | number | 0.3 | Opacity change probability |
| color | string | "rgb(0,0,0)" | Square color |
| width | number | - | Canvas width |
| height | number | - | Canvas height |
| className | string | - | CSS classes |
| maxOpacity | number | 0.3 | Max flicker opacity |
**Sub-components:** None
**Features:** Canvas-based flickering grid pattern
**Libraries:** Magic UI

### Globe
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
| config | COBEOptions | GLOBE_CONFIG | COBE globe configuration |
**Sub-components:** None
**Features:** Interactive 3D globe with markers (powered by COBE)
**Libraries:** Magic UI

### Grid Pattern
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| width | number | 40 | Cell width |
| height | number | 40 | Cell height |
| x | number | -1 | X offset |
| y | number | -1 | Y offset |
| strokeDasharray | string | "0" | SVG dash pattern |
| squares | Array<[number, number]> | - | Highlighted squares |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** SVG grid pattern background with highlighted cells
**Libraries:** Magic UI

### Hero Video Dialog
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| animationStyle | "from-bottom"/"from-center"/"from-top"/"from-left"/"from-right"/"fade"/"top-in-bottom-out"/"left-in-right-out" | "from-center" | Modal entry animation |
| videoSrc | string | required | Video URL |
| thumbnailSrc | string | required | Thumbnail image |
| thumbnailAlt | string | "Video thumbnail" | Alt text |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Video modal with 8 animation styles, keyboard close
**Libraries:** Magic UI

### Highlighter
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Content |
| action | AnnotationAction | "highlight" | Style: highlight/underline/box/circle/strike-through/crossed-off/bracket |
| color | string | "#ffd1dc" | Annotation color |
| strokeWidth | number | 1.5 | Stroke thickness |
| animationDuration | number | 600 | Duration (ms) |
| iterations | number | 2 | Animation iterations |
| padding | number | 2 | Space around element |
| multiline | boolean | true | Multi-line support |
| isView | boolean | false | Trigger on viewport entry |
**Sub-components:** None
**Features:** 7 annotation styles, viewport trigger, multi-line
**Libraries:** Magic UI

### Hyper Text
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | string | required | Text content |
| className | string | - | CSS classes |
| duration | number | 800 | Duration (ms) |
| delay | number | 0 | Delay (ms) |
| as | MotionElementType | "div" | Element type |
| startOnView | boolean | false | Start on viewport entry |
| animateOnHover | boolean | true | Trigger on hover |
| characterSet | string[] | A-Z | Scramble characters |
**Sub-components:** None
**Features:** Text scramble effect on hover, customizable character set
**Libraries:** Magic UI

### Icon Cloud
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| icons | ReactNode[] | - | SVG icon components |
| images | string[] | - | Image URLs |
**Sub-components:** None
**Features:** 3D rotating icon cloud using Fibonacci sphere
**Libraries:** Magic UI

### Interactive Hover Button
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | - | Button text |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Animated dot, sliding text with arrow on hover
**Libraries:** Magic UI

### iPhone
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| src | string | - | Image source |
| videoSrc | string | - | Video source |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** iPhone mockup with SVG masking, autoplay video
**Libraries:** Magic UI

### Lens (Magic UI)
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Content |
| zoomFactor | number | 1.3 | Magnification |
| lensSize | number | 170 | Lens size (px) |
| position | {x,y} | {0,0} | Lens position |
| defaultPosition | {x,y} | - | Default position |
| isStatic | boolean | false | Fixed position |
| duration | number | 0.1 | Animation duration |
| lensColor | string | "black" | Lens color |
| ariaLabel | string | "Zoom Area" | Aria label |
**Sub-components:** None
**Features:** Magnifying lens with spring animation
**Libraries:** Magic UI

### Light Rays
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| count | number | 7 | Number of rays |
| color | string | "rgba(160,210,255,0.2)" | Ray color |
| blur | number | 36 | Blur amount (px) |
| speed | number | 14 | Animation speed |
| length | string | "70vh" | Ray height |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Animated light ray beams
**Libraries:** Magic UI

### Magic Card
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | - | Content |
| className | string | - | CSS classes |
| gradientSize | number | 200 | Gradient radius (px) |
| gradientFrom | string | "#9E7AFF" | Gradient start |
| gradientTo | string | "#FE8BBB" | Gradient end |
| (gradient mode) gradientColor | string | "#262626" | Overlay color |
| (gradient mode) gradientOpacity | number | 0.8 | Overlay opacity |
| (orb mode) mode | "orb" | - | Enable orb mode |
| (orb mode) glowFrom | string | "#ee4f27" | Orb start color |
| (orb mode) glowTo | string | "#6b21ef" | Orb end color |
| (orb mode) glowAngle | number | 90 | Gradient angle |
| (orb mode) glowSize | number | 420 | Orb diameter (px) |
| (orb mode) glowBlur | number | 60 | Blur filter |
| (orb mode) glowOpacity | number | 0.9 | Orb opacity |
**Sub-components:** None
**Features:** Mouse-tracked gradient effect, gradient/orb modes
**Libraries:** Magic UI

### Marquee
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
| reverse | boolean | false | Reverse direction |
| pauseOnHover | boolean | false | Pause on hover |
| children | ReactNode | required | Content |
| vertical | boolean | false | Vertical direction |
| repeat | number | 4 | Content repeat count |
**Sub-components:** None
**Features:** Horizontal/vertical infinite scroll marquee
**Libraries:** Magic UI

### Meteors
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| number | number | 20 | Meteor count |
| minDelay | number | 0.2 | Min delay (s) |
| maxDelay | number | 1.2 | Max delay (s) |
| minDuration | number | 2 | Min duration (s) |
| maxDuration | number | 10 | Max duration (s) |
| angle | number | 215 | Movement angle (degrees) |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Falling meteor animation with configurable angle
**Libraries:** Magic UI

### Morphing Text
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| texts | string[] | required | Text array to morph through |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Text morphing using blur/fade between strings
**Libraries:** Magic UI

### Neon Gradient Card
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| as | ReactElement | <div/> | Render element |
| className | string | "" | CSS classes |
| children | ReactNode | "" | Content |
| borderSize | number | 2 | Border size (px) |
| borderRadius | number | 20 | Border radius (px) |
| neonColors | {firstColor: string, secondColor: string} | {firstColor:"#ff00aa", secondColor:"#00FFF1"} | Neon colors |
**Sub-components:** None
**Features:** Animated neon gradient border glow
**Libraries:** Magic UI

### Number Ticker
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | number | required | Target number |
| startValue | number | 0 | Starting number |
| direction | "up"/"down" | "up" | Animation direction |
| delay | number | 0 | Delay (s) |
| decimalPlaces | number | 0 | Decimal digits |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Animated number counting with spring physics
**Libraries:** Magic UI

### Orbiting Circles
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
| children | ReactNode | - | Orbiting content |
| reverse | boolean | - | Reverse direction |
| duration | number | 20 | Cycle time (s) |
| delay | number | - | Start delay |
| radius | number | 160 | Orbit radius (px) |
| path | boolean | true | Show orbit path |
| iconSize | number | 30 | Icon size (px) |
| speed | number | 1 | Speed multiplier |
**Sub-components:** None
**Features:** Circular orbiting animation with visible path
**Libraries:** Magic UI

### Particles
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | "" | CSS classes |
| quantity | number | 100 | Particle count |
| staticity | number | 50 | Mouse resistance |
| ease | number | 50 | Animation smoothness |
| size | number | 0.4 | Particle size (px) |
| refresh | boolean | false | Reinitialize trigger |
| color | string | "#ffffff" | Particle color (hex) |
| vx | number | 0 | Horizontal velocity |
| vy | number | 0 | Vertical velocity |
**Sub-components:** None
**Features:** Canvas particles with mouse interaction
**Libraries:** Magic UI

### Pointer
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | Pointer icon classes |
| children | ReactNode | SVG arrow | Custom pointer content |
**Sub-components:** None
**Features:** Custom animated cursor following mouse
**Libraries:** Magic UI

### Progressive Blur
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
| height | string | "30%" | Blur extent |
| position | "top"/"bottom"/"both" | "bottom" | Blur position |
| blurLevels | number[] | [0.5,1,2,4,8,16,32,64] | Blur intensity layers |
| children | ReactNode | - | Content |
**Sub-components:** None
**Features:** Multi-layer progressive blur gradient
**Libraries:** Magic UI, Motion Primitives

### Pulsating Button
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| pulseColor | string | "#808080" | Pulse color |
| duration | string | "1.5s" | Pulse duration |
| className | string | - | CSS classes |
| children | ReactNode | - | Content |
**Sub-components:** None
**Features:** Button with pulsing animation ring
**Libraries:** Magic UI

### Rainbow Button
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
| variant | "default"/"outline" | "default" | Visual variant |
| size | "default"/"sm"/"lg"/"icon" | "default" | Button size |
| asChild | boolean | false | Render as child |
**Sub-components:** None
**Features:** Animated rainbow gradient border
**Libraries:** Magic UI

### Retro Grid
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
| angle | number | 65 | Grid rotation angle |
| cellSize | number | 60 | Cell size (px) |
| opacity | number | 0.5 | Grid opacity |
| lightLineColor | string | "gray" | Light mode line color |
| darkLineColor | string | "gray" | Dark mode line color |
**Sub-components:** None
**Features:** Perspective grid background effect
**Libraries:** Magic UI

### Ripple
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| mainCircleSize | number | 210 | Main circle size (px) |
| mainCircleOpacity | number | 0.24 | Main circle opacity |
| numCircles | number | 8 | Number of circles |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Concentric ripple circles with staggered animation
**Libraries:** Magic UI

### Ripple Button
**Props:** className, children (standard button with ripple click effect)
**Features:** Material-design ripple on click
**Libraries:** Magic UI

### Safari
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| url | string | - | Address bar URL |
| imageSrc | string | - | Content image |
| videoSrc | string | - | Content video |
| mode | "default"/"simple" | "default" | Rendering mode |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Safari browser mockup with image/video content
**Libraries:** Magic UI

### Scroll-Based Velocity
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| (Row) children | ReactNode | required | Content |
| (Row) baseVelocity | number | 5 | Base speed |
| (Row) direction | 1/-1 | 1 | Movement direction |
| (Row) scrollReactivity | boolean | true | Respond to scroll |
| (Row) className | string | - | CSS classes |
**Sub-components:** ScrollVelocityContainer, ScrollVelocityRow
**Features:** Scroll-speed-reactive text/content scrolling
**Libraries:** Magic UI

### Scroll Progress
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Fixed scroll progress bar with gradient
**Libraries:** Magic UI, Motion Primitives

### Shimmer Button
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| shimmerColor | string | "#ffffff" | Shimmer color |
| shimmerSize | string | "0.05em" | Shimmer width |
| borderRadius | string | "100px" | Corner radius |
| shimmerDuration | string | "3s" | Shimmer cycle duration |
| background | string | "rgba(0,0,0,1)" | Button background |
| className | string | - | CSS classes |
| children | ReactNode | - | Content |
**Sub-components:** None
**Features:** Continuous shimmer sweep animation
**Libraries:** Magic UI

### Shine Border
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| borderWidth | number | 1 | Border width (px) |
| duration | number | 14 | Animation duration (s) |
| shineColor | string/string[] | "#000000" | Border color(s) |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Animated rotating shine border
**Libraries:** Magic UI

### Shiny Button
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Content |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Animated shine sweep with spring physics
**Libraries:** Magic UI

### Smooth Cursor
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| cursor | ReactNode | DefaultCursorSVG | Custom cursor element |
| springConfig | {damping: number, stiffness: number, mass: number, restDelta: number} | {damping:45, stiffness:400, mass:1, restDelta:0.001} | Spring physics |
**Sub-components:** None
**Features:** Spring-physics custom cursor, velocity-based rotation
**Libraries:** Magic UI

### Sparkles Text
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| as | ReactElement | <div/> | Render element |
| className | string | "" | CSS classes |
| children | ReactNode | required | Content |
| sparklesCount | number | 10 | Sparkle count |
| colors | {first: string, second: string} | {first:"#9E7AFF", second:"#FE8BBB"} | Sparkle colors |
**Sub-components:** None
**Features:** Animated sparkle effects on text
**Libraries:** Magic UI

### Spinning Text
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | string/string[] | required | Text content |
| duration | number | 10 | Cycle duration (s) |
| reverse | boolean | false | Counter-clockwise |
| radius | number | 5 | Distance from center |
| transition | Transition | - | Custom transition |
| variants | {container?: Variants, item?: Variants} | - | Custom variants |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Circular text rotation animation
**Libraries:** Magic UI

### Striped Pattern
**Props:** className, color, angle, spacing, strokeWidth
**Features:** SVG striped background pattern
**Libraries:** Magic UI

### Terminal
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Terminal content |
| className | string | - | CSS classes |
| sequence | boolean | true | Sequential animation |
| startOnView | boolean | true | Start on viewport entry |
**Sub-components:** AnimatedSpan, TypingAnimation (internal)
**Features:** Terminal UI with sequential content animation
**Libraries:** Magic UI

### Text Animate
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | string | required | Text content |
| className | string | - | CSS classes |
| segmentClassName | string | - | Segment classes |
| delay | number | 0 | Start delay |
| duration | number | 0.3 | Duration |
| variants | Variants | - | Custom variants |
| as | MotionElementType | "p" | Element type |
| by | "text"/"word"/"character"/"line" | "word" | Split method |
| startOnView | boolean | true | Start on viewport |
| once | boolean | false | Animate once |
| animation | AnimationVariant | "fadeIn" | Preset: fadeIn/blurIn/blurInUp/blurInDown/slideUp/slideDown/slideLeft/slideRight/scaleUp/scaleDown |
| accessible | boolean | true | A11y features |
**Sub-components:** None
**Features:** 10 animation presets, 4 split modes, viewport trigger
**Libraries:** Magic UI

### Text Reveal
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | string | required | Text content |
| className | string | - | CSS classes |
**Sub-components:** None (Word internal component)
**Features:** Scroll-driven word-by-word text reveal
**Libraries:** Magic UI

### Typing Animation
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | string | - | Static text |
| words | string[] | - | Words to cycle |
| className | string | - | CSS classes |
| duration | number | 100 | Default char timing (ms) |
| typeSpeed | number | duration | Type speed (ms/char) |
| deleteSpeed | number | typeSpeed/2 | Delete speed (ms/char) |
| delay | number | 0 | Initial delay (ms) |
| pauseDelay | number | 1000 | Pause between words (ms) |
| loop | boolean | false | Repeat indefinitely |
| as | MotionElementType | "span" | Element type |
| startOnView | boolean | true | Start on viewport |
| showCursor | boolean | true | Show cursor |
| blinkCursor | boolean | true | Blink cursor |
| cursorStyle | "line"/"block"/"underscore" | "line" | Cursor style |
**Sub-components:** None
**Features:** Typewriter with cursor styles, word cycling, delete animation
**Libraries:** Magic UI

### Video Text
**Props:** children (string), src (video URL), className
**Features:** Text with video fill/mask
**Libraries:** Magic UI

### Warp Background
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Content |
| perspective | number | 100 | 3D perspective depth |
| beamsPerSide | number | 3 | Beams per edge |
| beamSize | number | 5 | Grid cell size (%) |
| beamDelayMax | number | 3 | Max delay (s) |
| beamDelayMin | number | 0 | Min delay (s) |
| beamDuration | number | 3 | Animation duration (s) |
| gridColor | string | "var(--border)" | Grid line color |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** 3D perspective grid with animated beam lines
**Libraries:** Magic UI

### Word Rotate
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| words | string[] | required | Words to cycle |
| duration | number | 2500 | Display time (ms) |
| motionProps | MotionProps | {initial:{opacity:0,y:-50},animate:{opacity:1,y:0},exit:{opacity:0,y:50}} | Animation config |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Word rotation with configurable enter/exit animations
**Libraries:** Magic UI

---

## 3. Stunning UI (https://stunningui.design)

Note: stunningui.design appears to be a parked/inactive domain. The library may have been discontinued or moved.

---

## 4. Animata (https://animata.design)

### Background Components

#### Animated Beam
**Props:** className, containerRef, fromRef, toRef, curvature, pathColor, pathWidth, gradientColors
**Features:** SVG beam animation between elements
**Libraries:** Animata

#### Blurry Blob
**Props:** className, colors, size
**Features:** Animated blurry blob background
**Libraries:** Animata

#### Diagonal Lines
**Props:** className, color, gap, strokeWidth
**Features:** SVG diagonal line pattern
**Libraries:** Animata

#### Dot / Grid / Interactive Grid
**Props:** className, color, size, gap, interactive (for Interactive Grid)
**Features:** Dot/grid patterns, interactive version responds to mouse
**Libraries:** Animata

#### Moving Gradient
**Props:** className, colors, speed
**Features:** Animated gradient background
**Libraries:** Animata

#### Zigzag
**Props:** className, color, amplitude, frequency
**Features:** Zigzag pattern background
**Libraries:** Animata

### Button Components

#### AI Button
**Props:** children, className, gradient
**Features:** AI-themed gradient button
**Libraries:** Animata

#### Animated Follow Button
**Props:** children, className, followText, followingText
**Features:** Toggle button with animated state transition
**Libraries:** Animata

#### Ripple Button
**Props:** children, className, rippleColor
**Features:** Material-style ripple on click
**Libraries:** Animata

#### Shining Button
**Props:** children, className, shimmerColor
**Features:** Shimmer/shine sweep animation
**Libraries:** Animata

#### Slide Arrow Button
**Props:** children, className
**Features:** Arrow slides in on hover
**Libraries:** Animata

#### Status Button
**Props:** children, className, status ("success"/"error"/"loading")
**Features:** Status-aware button with animated indicators
**Libraries:** Animata

#### Swipe Button
**Props:** children, className, onSwipe
**Features:** Swipe-to-confirm interaction
**Libraries:** Animata

#### Toggle Switch
**Props:** checked, onChange, className
**Features:** Animated toggle switch
**Libraries:** Animata

### Card Components

#### Flip Card
**Props:** front, back, className, direction ("horizontal"/"vertical")
**Features:** 3D flip on hover, front/back content
**Libraries:** Animata

#### Glowing Card
**Props:** children, className, glowColor
**Features:** Glowing border effect on hover
**Libraries:** Animata

#### Staggered Card
**Props:** items, className, staggerDelay
**Features:** Cards appear with staggered animation
**Libraries:** Animata

#### Swap Card
**Props:** front, back, className
**Features:** Cards swap positions on interaction
**Libraries:** Animata

#### Tilted Card
**Props:** children, className, tiltAmount
**Features:** CSS 3D tilt effect on hover
**Libraries:** Animata

### Container Components

#### Animated Border Trail
**Props:** children, className, trailColor, duration
**Features:** Animated border trail around container
**Libraries:** Animata

#### Animated Dock
**Props:** items, className, magnification
**Features:** macOS-style dock with magnification
**Libraries:** Animata

#### Cursor Tracker
**Props:** children, className
**Features:** Custom cursor tracking within container
**Libraries:** Animata

#### Marquee
**Props:** children, speed, direction, pauseOnHover
**Features:** Infinite scrolling content
**Libraries:** Animata

### Hero Components

#### Hero Section
**Props:** title, subtitle, cta, backgroundEffect
**Features:** Full hero section with background effects
**Libraries:** Animata

#### Shape Shifter
**Props:** shapes, className, duration
**Features:** Morphing SVG shapes animation
**Libraries:** Animata

### Text Components

#### Animated Gradient Text
**Props:** children, className, colors, speed
**Features:** Animated gradient across text
**Libraries:** Animata

#### Circular Text
**Props:** text, radius, className, duration
**Features:** Text arranged in a circle, optionally rotating
**Libraries:** Animata

#### Counter
**Props:** value, duration, className, prefix, suffix
**Features:** Animated number counter
**Libraries:** Animata

#### Cycle Text
**Props:** words, className, duration
**Features:** Cycling through text with animation
**Libraries:** Animata

#### Gibberish Text
**Props:** children, className, characterSet
**Features:** Text scramble/unscramble effect
**Libraries:** Animata

#### Glitch Text
**Props:** children, className, glitchColors
**Features:** CSS glitch text effect
**Libraries:** Animata

#### Jitter Text
**Props:** children, className, intensity
**Features:** Text with random jitter/shake
**Libraries:** Animata

#### Jumping Text
**Props:** children, className, delay
**Features:** Instagram-style jumping text animation
**Libraries:** Animata

#### Scroll Reveal
**Props:** children, className, threshold
**Features:** Text reveals on scroll
**Libraries:** Animata

#### Staggered Letter
**Props:** children, className, staggerDelay
**Features:** Letters appear one by one
**Libraries:** Animata

#### Text Flip
**Props:** children, className
**Features:** Text flip animation
**Libraries:** Animata

#### Ticker
**Props:** value, className, duration
**Features:** Ticker-style number/text animation
**Libraries:** Animata

#### Typing Text
**Props:** text, className, speed, cursor
**Features:** Typewriter effect
**Libraries:** Animata

#### Wave Reveal
**Props:** children, className, waveHeight
**Features:** Text revealed with wave animation
**Libraries:** Animata

### Graph Components
Bar Chart, Commit Graph, Donut Chart, Gauge Chart, Progress, Ring Chart -- standard chart components with animation props (value, data, className, colors, duration)

### Widget Components
50+ widget components including: Alarm Clock, Battery, Calendar, Cycling, Expense Tracker, Flight Widget, Music Widget, Score Board, Weather Card, etc. Each has domain-specific props.

---

## 5. Luxe UI (https://luxeui.com)

### Button
**Props:** variant, size, className, children, asChild
**Features:** Animated button with hover effects
**Libraries:** Luxe UI

### Input OTP
**Props:** maxLength, value, onChange, className
**Features:** OTP input with animated focus
**Libraries:** Luxe UI

### Accordion
**Props:** type ("single"/"multiple"), collapsible, className, defaultValue
**Sub-components:** AccordionItem, AccordionTrigger, AccordionContent
**Features:** Animated accordion with Radix primitives
**Libraries:** Luxe UI

### Dropdown Menu
**Props:** children, className
**Sub-components:** DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
**Features:** Animated dropdown menu
**Libraries:** Luxe UI

### Multi Step Modal
**Props:** steps, currentStep, className
**Features:** Multi-step modal with transitions
**Libraries:** Luxe UI

### Animated Tabs
**Props:** tabs, className, defaultValue
**Features:** Tabs with animated indicator
**Libraries:** Luxe UI

### Tooltip
**Props:** content, children, className, side, align
**Features:** Animated tooltip with configurable position
**Libraries:** Luxe UI

---

## 6. Eldora UI (https://eldoraui.site)

### Text Animation Components

#### Blur In Text
**Props:** children, className, delay, duration
**Features:** Text fades in from blur
**Libraries:** Eldora UI

#### Fade Text
**Props:** children, className, direction, delay
**Features:** Text fade animation with direction
**Libraries:** Eldora UI

#### Gradual Spacing Text
**Props:** children, className, duration
**Features:** Letters gradually space out
**Libraries:** Eldora UI

#### Letter Pull Up Text
**Props:** children, className, delay
**Features:** Letters pull up one by one
**Libraries:** Eldora UI

#### Multi-Direction Slide Text
**Props:** children, className, direction ("up"/"down"/"left"/"right")
**Features:** Text slides in from any direction
**Libraries:** Eldora UI

#### Scale Letter Text
**Props:** children, className, delay
**Features:** Letters scale up on entry
**Libraries:** Eldora UI

#### Separate Away Text
**Props:** children, className, delay
**Features:** Letters separate and disperse
**Libraries:** Eldora UI

#### Wavy Text
**Props:** children, className, waveHeight, duration
**Features:** Text with wave animation
**Libraries:** Eldora UI

#### Word Pull Up Text
**Props:** children, className, delay
**Features:** Words pull up sequentially
**Libraries:** Eldora UI

### Interactive Components

#### Animated Badge
**Props:** children, className, variant
**Features:** Badge with animated entrance
**Libraries:** Eldora UI

#### Animated Shiny Button
**Props:** children, className, shimmerColor
**Features:** Button with shiny shimmer effect
**Libraries:** Eldora UI

#### Card Flip Hover
**Props:** front, back, className
**Features:** 3D card flip on hover
**Libraries:** Eldora UI

#### Dock Text
**Props:** items, className, magnification
**Features:** macOS dock-style text navigation
**Libraries:** Eldora UI

#### Live Button
**Props:** children, className, pulseColor
**Features:** Button with live pulse indicator
**Libraries:** Eldora UI

#### Logo Timeline
**Props:** logos, className, duration
**Features:** Animated logo carousel/timeline
**Libraries:** Eldora UI

#### Testimonial Slider
**Props:** testimonials, className, autoplay
**Features:** Animated testimonial carousel
**Libraries:** Eldora UI

### Mockup Components

#### Browser
**Props:** url, children, className
**Features:** Browser chrome mockup
**Libraries:** Eldora UI

#### iPad
**Props:** children, className
**Features:** iPad device mockup
**Libraries:** Eldora UI

#### iPhone 17 Pro
**Props:** src, videoSrc, className
**Features:** iPhone device mockup
**Libraries:** Eldora UI

#### MacBook Pro
**Props:** src, className
**Features:** MacBook device mockup
**Libraries:** Eldora UI

#### Safari Browser
**Props:** url, imageSrc, className
**Features:** Safari browser mockup
**Libraries:** Eldora UI

### Background Components

#### Grid
**Props:** className, color, size
**Features:** Grid background pattern
**Libraries:** Eldora UI

#### Hacker Background
**Props:** className, color, speed
**Features:** Matrix-style falling characters
**Libraries:** Eldora UI

#### Novatrix Background
**Props:** className, colors
**Features:** Abstract animated background
**Libraries:** Eldora UI

#### Photon Beam
**Props:** className, color, width
**Features:** Animated photon beam effect
**Libraries:** Eldora UI

### Other Components

#### Animated Frameworks
**Props:** frameworks, className, duration
**Features:** Framework logos with animated transitions
**Libraries:** Eldora UI

#### Cobe Globe
**Props:** className, config
**Features:** 3D interactive globe
**Libraries:** Eldora UI

#### Map
**Props:** className, markers, center
**Features:** Interactive map component
**Libraries:** Eldora UI

#### Terminal
**Props:** children, className
**Features:** Terminal UI mockup
**Libraries:** Eldora UI

---

## 7. Cult UI (https://www.cult-ui.com)

### Marketing Components

#### Hero Dithering
**Props:** className, ditherPattern, colors
**Features:** Hero section with dithering effect
**Libraries:** Cult UI

#### Hero Color Panels
**Props:** panels, className
**Features:** Animated color panel hero
**Libraries:** Cult UI

#### Hero Heatmap
**Props:** className, data
**Features:** Hero with heatmap visualization
**Libraries:** Cult UI

#### Hero Liquid Metal
**Props:** className, metalColor
**Features:** Liquid metal shader effect
**Libraries:** Cult UI

#### Logo Carousel
**Props:** logos, className, speed
**Features:** Animated logo marquee
**Libraries:** Cult UI

#### Gradient Heading
**Props:** children, className, colors
**Features:** Animated gradient heading text
**Libraries:** Cult UI

### Button Components

#### Neumorph Button
**Props:** children, className
**Features:** Neumorphic design with press animation
**Libraries:** Cult UI

#### Family Button
**Props:** children, className, members
**Features:** Expanding button group
**Libraries:** Cult UI

#### Texture Button
**Props:** children, className, texture
**Features:** Textured surface button
**Libraries:** Cult UI

#### Bg Animate Button
**Props:** children, className, animationType
**Features:** Button with animated background
**Libraries:** Cult UI

#### Cosmic Button
**Props:** children, className
**Features:** Space/cosmic themed animated button
**Libraries:** Cult UI

#### Gradient Button Group
**Props:** buttons, className
**Features:** Group of gradient-animated buttons
**Libraries:** Cult UI

### Card Components

#### Expandable Screen / Expandable Card
**Props:** children, className, expandedContent
**Features:** Click to expand with layout animation
**Libraries:** Cult UI

#### Minimal Card / Neumorph Eyebrow
**Props:** children, className
**Features:** Minimal/neumorphic card designs
**Libraries:** Cult UI

#### Texture Card / Shift Card
**Props:** children, className, texture/shiftDirection
**Features:** Textured surface or shift animation cards
**Libraries:** Cult UI

#### Distorted Glass
**Props:** children, className, distortion
**Features:** Glass morphism with distortion effect
**Libraries:** Cult UI

### Layout Components

#### Direction Aware Tabs
**Props:** tabs, className, direction
**Features:** Tab indicator follows movement direction
**Libraries:** Cult UI

#### Side Panel / Floating Panel
**Props:** children, className, position, open
**Features:** Animated side/floating panels
**Libraries:** Cult UI

#### Family Drawer
**Props:** children, className
**Features:** Bottom drawer with spring animation
**Libraries:** Cult UI

#### Sortable List
**Props:** items, className, onReorder
**Features:** Drag-to-reorder animated list
**Libraries:** Cult UI

#### Toolbar Expandable
**Props:** items, className
**Features:** Expandable toolbar with smooth animations
**Libraries:** Cult UI

### Interactive Elements

#### Dynamic Island
**Props:** content, className, expanded
**Features:** Apple Dynamic Island-style component
**Libraries:** Cult UI

#### Color Picker
**Props:** value, onChange, className
**Features:** Animated color picker
**Libraries:** Cult UI

#### MacOS Dock
**Props:** items, className, magnification
**Features:** macOS dock with magnification
**Libraries:** Cult UI

#### Terminal Animation
**Props:** commands, className, speed
**Features:** Animated terminal with typing
**Libraries:** Cult UI

### Typography Components

#### Pixel Heading (Char) / Pixel Heading (Word)
**Props:** children, className, pixelSize
**Features:** Pixelated text reveal animation (by character or word)
**Libraries:** Cult UI

#### Pixel Paragraph / Pixel Paragraph Inv
**Props:** children, className
**Features:** Paragraph with pixel animation
**Libraries:** Cult UI

#### Text Gif
**Props:** frames, className, fps
**Features:** Text animated like a GIF
**Libraries:** Cult UI

#### Text Animate
**Props:** children, className, animation
**Features:** Various text animation presets
**Libraries:** Cult UI

#### Typewriter
**Props:** text, className, speed
**Features:** Typewriter text effect
**Libraries:** Cult UI

#### Animated Number
**Props:** value, className, duration
**Features:** Animated number transition
**Libraries:** Cult UI

### Visual Effects

#### LightBoard
**Props:** text, className, colors
**Features:** LED lightboard-style text display
**Libraries:** Cult UI

#### Fractal Grid / Canvas Fractal Grid
**Props:** className, depth, colors
**Features:** Recursive fractal grid pattern
**Libraries:** Cult UI

#### Shader Lens Blur
**Props:** children, className, intensity
**Features:** WebGL shader-based lens blur
**Libraries:** Cult UI

#### Stripe Bg Guides
**Props:** className, stripeCount, color
**Features:** Stripe.com-style background guides
**Libraries:** Cult UI

### Media Components

#### 3D Carousel
**Props:** items, className, perspective
**Features:** 3D perspective carousel
**Libraries:** Cult UI

#### Hover Video Player
**Props:** src, poster, className
**Features:** Video plays on hover
**Libraries:** Cult UI

---

## 8. Motion Primitives (https://motion-primitives.com)

### Accordion
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | - | Content |
| className | string | - | CSS classes |
| transition | Transition | - | Motion transition |
| variants | {expanded: Variant, collapsed: Variant} | - | Animation states |
| expandedValue | React.Key/null | - | Controlled value |
| onValueChange | (React.Key/null) => void | - | Change callback |
**Sub-components:** AccordionItem, AccordionTrigger, AccordionContent
**Features:** Animated accordion with compound component pattern
**Libraries:** Motion Primitives

### Animated Background
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactElement[] | - | Elements with data-id |
| defaultValue | string | - | Default active ID |
| onValueChange | (string/null) => void | - | Change callback |
| className | string | - | CSS classes |
| transition | Transition | - | Motion transition |
| enableHover | boolean | false | Enable hover mode |
**Sub-components:** None
**Features:** Animated highlight background following active item
**Libraries:** Motion Primitives

### Animated Group
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | - | Elements |
| className | string | - | CSS classes |
| variants | {container?: Variants, item?: Variants} | - | Animation variants |
| preset | "fade"/"slide"/"scale"/"blur-sm"/"blur-slide" | - | Animation preset |
| as | React.ElementType | "div" | Container element |
| asChild | React.ElementType | "div" | Child element type |
**Sub-components:** None
**Features:** Staggered group animations with presets
**Libraries:** Motion Primitives

### Animated Number
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | number | required | Number to animate |
| className | string | - | CSS classes |
| springOptions | SpringOptions | - | Spring config |
| as | React.ElementType | "span" | Element type |
**Sub-components:** None
**Features:** Spring-animated number transitions
**Libraries:** Motion Primitives

### Border Trail
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
| size | number | 60 | Trail size |
| transition | Transition | {repeat:Infinity, duration:5, ease:"linear"} | Animation config |
| onAnimationComplete | () => void | - | Complete callback |
| style | CSSProperties | - | Inline styles |
**Sub-components:** None
**Features:** Animated border trail around element
**Libraries:** Motion Primitives

### Carousel
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| (Carousel) initialIndex | number | 0 | Start index |
| (Carousel) index | number | - | Controlled index |
| (Carousel) onIndexChange | (number) => void | - | Index callback |
| (Carousel) disableDrag | boolean | false | Disable drag |
| (CarouselNavigation) alwaysShow | boolean | false | Always show nav |
**Sub-components:** Carousel, CarouselContent, CarouselNavigation, CarouselIndicator, CarouselItem
**Features:** Draggable carousel with navigation and indicators
**Libraries:** Motion Primitives

### Cursor
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Cursor content |
| className | string | - | CSS classes |
| springConfig | SpringOptions | - | Spring physics |
| attachToParent | boolean | false | Parent-only visibility |
| transition | Transition | - | Animation transition |
| variants | {initial, animate, exit} | - | Animation states |
| onPositionChange | (x,y) => void | - | Position callback |
**Sub-components:** None
**Features:** Custom animated cursor with spring physics
**Libraries:** Motion Primitives

### Dialog
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Dialog content |
| variants | Variants | - | Animation states |
| transition | Transition | - | Animation settings |
| className | string | - | CSS classes |
| defaultOpen | boolean | false | Default state |
| onOpenChange | (boolean) => void | - | State callback |
| open | boolean | - | Controlled state |
**Sub-components:** DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose
**Features:** Animated dialog with controlled/uncontrolled modes
**Libraries:** Motion Primitives

### Disclosure
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| open | boolean | false | Visibility state |
| onOpenChange | (boolean) => void | - | State callback |
| children | ReactNode | - | Content |
| className | string | - | CSS classes |
| variants | {expanded: Variant, collapsed: Variant} | - | Animation states |
| transition | Transition | - | Transition settings |
**Sub-components:** DisclosureTrigger, DisclosureContent
**Features:** Animated show/hide with expand/collapse
**Libraries:** Motion Primitives

### Dock (Motion Primitives)
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | - | Dock items |
| className | string | - | CSS classes |
| spring | SpringOptions | {mass:0.1, stiffness:150, damping:12} | Spring config |
| magnification | number | 80 | Scale factor |
| distance | number | 150 | Magnification range (px) |
| panelHeight | number | 64 | Panel height |
**Sub-components:** DockItem, DockLabel, DockIcon
**Features:** macOS dock with spring-based magnification
**Libraries:** Motion Primitives

### Glow Effect
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
| style | CSSProperties | - | Inline styles |
| colors | string[] | ['#FF5733','#33FF57','#3357FF','#F1C40F'] | Glow colors |
| mode | 'rotate'/'pulse'/'breathe'/'colorShift'/'flowHorizontal'/'static' | 'rotate' | Animation mode |
| blur | number/"softest"..."strongest"/"none" | 'medium' | Blur level |
| transition | Transition | - | Transition config |
| scale | number | 1 | Glow scale |
| duration | number | 5 | Duration (s) |
**Sub-components:** None
**Features:** 6 animation modes, configurable colors and blur
**Libraries:** Motion Primitives

### Image Comparison
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| (ImageComparison) enableHover | boolean | false | Hover mode |
| (ImageComparison) springOptions | SpringOptions | {bounce:0, duration:0} | Spring config |
| (ImageComparisonImage) src | string | - | Image URL |
| (ImageComparisonImage) alt | string | - | Alt text |
| (ImageComparisonImage) position | "left"/"right" | "left" | Image position |
**Sub-components:** ImageComparison, ImageComparisonImage, ImageComparisonSlider
**Features:** Before/after image comparison with slider
**Libraries:** Motion Primitives

### In View
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | - | Content |
| variants | {hidden: Variant, visible: Variant} | {hidden:{opacity:0}, visible:{opacity:1}} | States |
| transition | Transition | - | Transition config |
| viewOptions | UseInViewOptions | - | IntersectionObserver config |
| as | React.ElementType | "div" | Element type |
| once | boolean | false | Animate only once |
**Sub-components:** None
**Features:** Viewport-triggered animation
**Libraries:** Motion Primitives

### Infinite Slider
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | - | Slider content |
| gap | number | 16 | Gap between items (px) |
| speed | number | 100 | Speed (px/s) |
| speedOnHover | number | - | Speed when hovered |
| direction | "horizontal"/"vertical" | "horizontal" | Direction |
| reverse | boolean | false | Reverse direction |
| className | string | - | CSS classes |
**Sub-components:** None
**Features:** Infinite looping slider with hover speed control
**Libraries:** Motion Primitives

### Magnetic
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | - | Content |
| intensity | number | 0.6 | Magnetic strength |
| range | number | 100 | Effect range (px) |
| actionArea | "self"/"parent"/"global" | "self" | Trigger scope |
| springOptions | SpringOptions | {stiffness:26.7, damping:4.1, mass:0.2} | Spring config |
**Sub-components:** None
**Features:** Magnetic attraction effect following cursor
**Libraries:** Motion Primitives

### Morphing Dialog
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| (MorphingDialog) transition | Transition | - | Animation settings |
**Sub-components:** MorphingDialogTrigger, MorphingDialogContainer, MorphingDialogContent, MorphingDialogTitle, MorphingDialogSubtitle, MorphingDialogDescription, MorphingDialogImage, MorphingDialogClose
**Features:** Layout animation dialog, click-outside/escape close
**Libraries:** Motion Primitives

### Morphing Popover
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Content |
| transition | Transition | {type:"spring",bounce:0.1,duration:0.4} | Animation |
| defaultOpen | boolean | false | Initial state |
| open | boolean | - | Controlled state |
| onOpenChange | (boolean) => void | - | State callback |
| variants | Variants | - | Custom variants |
**Sub-components:** MorphingPopoverTrigger, MorphingPopoverContent
**Features:** Popover with layout animation morphing from trigger
**Libraries:** Motion Primitives

### Scroll Progress
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | - | CSS classes |
| springOptions | SpringOptions | {stiffness:200, damping:50, restDelta:0.001} | Spring config |
| containerRef | RefObject | - | Container ref |
**Sub-components:** None
**Features:** Animated scroll progress indicator
**Libraries:** Motion Primitives

### Sliding Number
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | string | required | Number to display |
| padStart | boolean | false | Pad with leading zero |
| decimalSeparator | string | "." | Decimal separator |
**Sub-components:** None
**Features:** Sliding digit animation for number changes
**Libraries:** Motion Primitives

### Spotlight
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | "" | CSS classes |
| size | number | 200 | Spotlight size (px) |
| springOptions | SpringOptions | {bounce:0} | Spring config |
**Sub-components:** None
**Features:** Cursor-tracking spotlight effect
**Libraries:** Motion Primitives

### Text Effect
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | string | - | Text content |
| per | "word"/"char"/"line" | "word" | Animation unit |
| as | keyof JSX.IntrinsicElements | "p" | HTML element |
| variants | {container?: Variants, item?: Variants} | - | Custom variants |
| className | string | - | CSS classes |
| preset | "blur-sm"/"fade-in-blur"/"scale"/"fade"/"slide" | "fade" | Animation preset |
| delay | number | 0 | Start delay |
| speedReveal | number | 1 | Reveal speed |
| speedSegment | number | 1 | Segment speed |
| trigger | boolean | true | Trigger animation |
| onAnimationComplete | () => void | - | Complete callback |
| onAnimationStart | () => void | - | Start callback |
| segmentWrapperClassName | string | - | Segment wrapper classes |
**Sub-components:** None
**Features:** 5 presets, per-char/word/line animation, callbacks
**Libraries:** Motion Primitives

### Text Loop
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode[] | - | Text elements |
| className | string | - | CSS classes |
| interval | number | 2 | Interval (s) |
| transition | Transition | {duration:0.3} | Animation |
| variants | Variants | - | Custom variants |
| onIndexChange | (number) => void | - | Index callback |
| trigger | boolean | true | Enable animation |
**Sub-components:** None
**Features:** Looping text rotation with customizable transitions
**Libraries:** Motion Primitives

### Text Morph
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | string | - | Text content |
| as | keyof JSX.IntrinsicElements | "p" | HTML element |
| className | string | - | CSS classes |
| style | CSSProperties | - | Inline styles |
| variants | Variants | - | Custom variants |
| transition | Transition | spring({stiffness:280,damping:18,mass:0.3}) | Spring config |
**Sub-components:** None
**Features:** Smooth text morphing between states
**Libraries:** Motion Primitives

### Text Roll
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Text to roll |
| className | string | - | CSS classes |
| duration | number | 0.5 | Duration (s) |
| getEnterDelay | (i: number) => number | (i) => i*0.1 | Enter delay per char |
| getExitDelay | (i: number) => number | (i) => i*0.1+0.2 | Exit delay per char |
| transition | Transition | {ease:"easeIn"} | Transition |
| variants | object | - | Enter/exit variants |
| onAnimationComplete | () => void | - | Complete callback |
**Sub-components:** None
**Features:** Rolling text rotation with per-character stagger
**Libraries:** Motion Primitives

### Text Scramble
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | string | - | Text content |
| as | keyof JSX.IntrinsicElements | "p" | HTML element |
| duration | number | 0.8 | Effect duration |
| speed | number | 0.04 | Effect speed |
| characterSet | string | A-Za-z0-9 | Scramble characters |
| className | string | - | CSS classes |
| trigger | boolean | - | Trigger control |
| onScrambleComplete | () => void | - | Complete callback |
**Sub-components:** None
**Features:** Text scramble/decode effect
**Libraries:** Motion Primitives

### Text Shimmer
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | string | - | Text content |
| as | keyof JSX.IntrinsicElements | "p" | HTML element |
| className | string | - | CSS classes |
| duration | number | 2 | Shimmer duration |
| spread | number | 2 | Shimmer spread |
**Sub-components:** None
**Features:** Shimmer sweep effect across text
**Libraries:** Motion Primitives

### Text Shimmer Wave
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | string | - | Text content |
| as | string | "p" | HTML element |
| className | string | - | CSS classes |
| duration | number | 1 | Wave duration |
| zDistance | number | 10 | Z-axis distance |
| xDistance | number | 2 | X-axis distance |
| yDistance | number | -2 | Y-axis distance |
| spread | number | 1 | Wave spread |
| scaleDistance | number | 1.1 | Scale amount |
| rotateYDistance | number | 10 | Y rotation |
| transition | Transition | - | Custom transition |
**Sub-components:** None
**Features:** 3D wave shimmer effect on text
**Libraries:** Motion Primitives

### Tilt
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Content |
| className | string | - | CSS classes |
| style | MotionStyle | - | Motion styles |
| rotationFactor | number | 15 | Max rotation angle |
| isRevese | boolean | false | Reverse direction |
| springOptions | SpringOptions | - | Spring config |
**Sub-components:** None
**Features:** Mouse-tracked 3D tilt effect
**Libraries:** Motion Primitives

### Toolbar Dynamic
**Props:** No external props (self-contained)
**Features:** Expandable toolbar with search, spring animations
**Libraries:** Motion Primitives

### Toolbar Expandable
**Props:** Similar pattern to Toolbar Dynamic
**Features:** Expandable toolbar component
**Libraries:** Motion Primitives

### Transition Panel
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode[] | - | Panel contents |
| className | string | - | CSS classes |
| transition | Transition | - | Animation config |
| activeIndex | number | - | Active child index |
| variants | {enter, center, exit} | - | Animation states |
**Sub-components:** None
**Features:** Animated panel transitions between content
**Libraries:** Motion Primitives

---

## 9. Ibelick UI (https://ui.ibelick.com)

### Text Gradient
**Props:** className (Tailwind gradient utility classes)
**Features:** Static gradient text
**Libraries:** Ibelick UI

### Text Animated Gradient
**Props:** className, duration, colors
**Features:** Animated gradient sweep on text
**Libraries:** Ibelick UI

### Text Shine
**Props:** className, shimmerWidth, duration
**Features:** Shine/shimmer sweep on text
**Libraries:** Ibelick UI

### Button Background Shine
**Props:** children, className, shimmerColor
**Features:** Button with background shine sweep
**Libraries:** Ibelick UI

### Button Gradient
**Props:** children, className, gradientColors
**Features:** Gradient-filled button
**Libraries:** Ibelick UI

### Button Hover Gradient
**Props:** children, className
**Features:** Gradient appears on hover
**Libraries:** Ibelick UI

### Button Background Spotlight
**Props:** children, className
**Features:** Spotlight effect following cursor on button
**Libraries:** Ibelick UI

### Button Rotating Background Gradient
**Props:** children, className, duration
**Features:** Continuously rotating gradient background
**Libraries:** Ibelick UI

### Button Shadow Gradient
**Props:** children, className
**Features:** Gradient drop shadow on button
**Libraries:** Ibelick UI

### Input Gradient Border
**Props:** className, placeholder, type
**Features:** Input with gradient border
**Libraries:** Ibelick UI

### Input Spotlight Border
**Props:** className, placeholder
**Features:** Input with cursor-tracking spotlight border
**Libraries:** Ibelick UI

### Input Pulse Border
**Props:** className, placeholder
**Features:** Input with pulsing border animation
**Libraries:** Ibelick UI

### Badge Animated Gradient Border
**Props:** children, className
**Features:** Badge with animated gradient border
**Libraries:** Ibelick UI

### Badge Shine
**Props:** children, className
**Features:** Badge with shine sweep
**Libraries:** Ibelick UI

### Badge Text Gradient
**Props:** children, className
**Features:** Badge with gradient text
**Libraries:** Ibelick UI

### Card Animated Border Gradient
**Props:** children, className
**Features:** Card with animated gradient border
**Libraries:** Ibelick UI

### Card Spotlight
**Props:** children, className, spotlightColor
**Features:** Card with cursor-tracking spotlight
**Libraries:** Ibelick UI

### Card Pulse Border
**Props:** children, className
**Features:** Card with pulsing border
**Libraries:** Ibelick UI

### Card Tilt
**Props:** children, className, tiltAmount
**Features:** 3D tilt effect on hover
**Libraries:** Ibelick UI

---

## 10. Hover.dev (https://www.hover.dev)

Hover.dev provides pre-built animated sections and components. Components are categorized into sections and individual components. Most are copy-paste code snippets rather than installable packages.

### Section Templates
- **3D Sections** - Three.js powered 3D hero sections
- **FAQ Sections** - Animated FAQ/accordion sections
- **Features Sections** - Feature showcase with animations
- **Form Sections** - Animated form layouts
- **Hero Sections** - Various animated hero patterns
- **Kanban Boards** - Drag-and-drop kanban
- **Pricing Sections** - Animated pricing tables
- **Stats** - Animated statistics counters
- **Sign In Sections** - Animated auth forms
- **Testimonial Sections** - Animated testimonials

### Component Categories

#### Accordions
**Props:** Standard accordion props (items, defaultOpen, className)
**Features:** Multiple animation styles for expand/collapse
**Libraries:** Hover.dev

#### Buttons
**Props:** children, className, variant (multiple animation variants)
**Features:** Hover animations, magnetic effects, gradient fills
**Libraries:** Hover.dev

#### Calendars
**Props:** date, events, className
**Features:** Animated calendar components
**Libraries:** Hover.dev

#### Cards
**Props:** children, className (various animation types)
**Features:** Tilt, flip, glow, spotlight, parallax card effects
**Libraries:** Hover.dev

#### Carousels
**Props:** items, autoplay, speed, className
**Features:** Multiple carousel animation styles
**Libraries:** Hover.dev

#### Countdown
**Props:** targetDate, className
**Features:** Animated countdown timer with digit transitions
**Libraries:** Hover.dev

#### Dropdown Menus
**Props:** items, className, trigger
**Features:** Animated dropdown with various enter/exit animations
**Libraries:** Hover.dev

#### Grids
**Props:** items, columns, className
**Features:** Animated grid layouts with stagger effects
**Libraries:** Hover.dev

#### Inputs
**Props:** placeholder, className, type (various animation styles)
**Features:** Animated focus states, floating labels
**Libraries:** Hover.dev

#### Links
**Props:** href, children, className
**Features:** Animated underlines, hover effects
**Libraries:** Hover.dev

#### Loaders
**Props:** className, size, color
**Features:** Multiple animated loading indicators
**Libraries:** Hover.dev

#### Modals
**Props:** open, onClose, children, className
**Features:** Animated modal enter/exit transitions
**Libraries:** Hover.dev

#### Navbars & Menus
**Props:** items, className, logo
**Features:** Animated navigation with various reveal styles
**Libraries:** Hover.dev

#### Notifications
**Props:** message, type, duration, className
**Features:** Animated toast notifications
**Libraries:** Hover.dev

#### Progress
**Props:** value, max, className
**Features:** Animated progress bars and circles
**Libraries:** Hover.dev

#### Tabs
**Props:** tabs, defaultValue, className
**Features:** Animated tab switching with indicator
**Libraries:** Hover.dev

#### Tables
**Props:** data, columns, className
**Features:** Animated data tables
**Libraries:** Hover.dev

#### Text
**Props:** children, className, animation
**Features:** Various text animation effects (typing, reveal, gradient)
**Libraries:** Hover.dev

#### Toggles
**Props:** checked, onChange, className
**Features:** Animated toggle switches
**Libraries:** Hover.dev

---

## Cross-Library Component Overlap

Components found in multiple libraries:

| Component Type | Libraries |
|---------------|-----------|
| Marquee/Infinite Scroll | Magic UI, Animata, Motion Primitives |
| Dock (macOS-style) | Aceternity UI, Magic UI, Motion Primitives, Animata, Cult UI |
| Spotlight/Glow | Aceternity UI, Magic UI, Motion Primitives, Ibelick UI |
| Text Scramble/Hyper | Magic UI, Motion Primitives, Animata |
| Number Ticker/Counter | Magic UI, Motion Primitives, Animata, Cult UI |
| Border Beam/Trail | Magic UI, Motion Primitives, Animata |
| Typewriter/Typing | Aceternity UI, Magic UI, Animata, Cult UI |
| Card Tilt/3D | Aceternity UI, Motion Primitives, Ibelick UI, Animata |
| Image Comparison | Aceternity UI, Motion Primitives |
| Particles/Sparkles | Aceternity UI, Magic UI |
| Globe/Map | Aceternity UI, Magic UI, Eldora UI |
| Device Mockups | Magic UI, Eldora UI |
| Gradient Text | Magic UI, Animata, Ibelick UI, Cult UI |
| Accordion | Motion Primitives, Luxe UI, Hover.dev, Animata |
| Carousel | Aceternity UI, Motion Primitives, Cult UI, Hover.dev |
| Progressive Blur | Magic UI, Motion Primitives |
