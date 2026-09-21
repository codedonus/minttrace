import { useEffect, useRef } from 'react';

/** A decorative evidence field. It never reads data or starts an investigation. */
export default function TraceScene({ paused }: { paused: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elapsed = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const context = canvas.getContext('2d');
    if (!context) return;
    let width = 600, height = 600, frame = 0, visible = true, last = 0, time = elapsed.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const points: { x: number; y: number; z: number; size: number }[] = [];
    // Elliptical meridians give the field a fingerprint-like, topographic form.
    for (let ring = 0; ring < 27; ring++) {
      const latitude = (ring / 26 - .5) * Math.PI;
      const count = Math.max(9, Math.round(65 * Math.cos(latitude)));
      for (let i = 0; i < count; i++) {
        const angle = i / count * Math.PI * 2;
        const ripple = 1 + .035 * Math.sin(angle * 3 + latitude * 4);
        points.push({x: Math.cos(latitude) * Math.cos(angle) * ripple, y: Math.sin(latitude) * 1.08, z: Math.cos(latitude) * Math.sin(angle), size: ring % 4 === 0 ? 1.25 : .7});
      }
    }
    function draw() {
      const ctx = context!;
      ctx.clearRect(0, 0, width, height);
      const size = Math.min(width, height) * .355;
      const cx = width * .51, cy = height * .49, rotation = time * .00012;
      const glow = ctx.createRadialGradient(cx,cy,0,cx,cy,size*1.5);
      glow.addColorStop(0,'rgba(133,190,100,.09)');glow.addColorStop(.65,'rgba(103,151,79,.035)');glow.addColorStop(1,'rgba(103,151,79,0)');
      ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
      // Slow orbital trails surround the source at the center.
      for (let orbit=0;orbit<3;orbit++) {
        ctx.save();ctx.translate(cx,cy);ctx.rotate(-.5+orbit*.88);
        ctx.strokeStyle=`rgba(171,215,139,${orbit===1?.2:.12})`;ctx.lineWidth=.7;
        ctx.beginPath();ctx.ellipse(0,0,size*1.38,size*(.52+orbit*.12),0,0,Math.PI*2);ctx.stroke();
        const a=rotation*(orbit%2===0?1:-1)+orbit*2;
        ctx.shadowColor='#d4f7a3';ctx.shadowBlur=12;ctx.fillStyle='#d4f7a3';ctx.beginPath();ctx.arc(Math.cos(a)*size*1.38,Math.sin(a)*size*(.52+orbit*.12),2.5,0,Math.PI*2);ctx.fill();ctx.restore();
      }
      const projected = points.map(p=>{
        const x=p.x*Math.cos(rotation)+p.z*Math.sin(rotation),z=-p.x*Math.sin(rotation)+p.z*Math.cos(rotation);
        const tilt=.18, y=p.y*Math.cos(tilt)-x*Math.sin(tilt), xx=x*Math.cos(tilt)+p.y*Math.sin(tilt);
        return {x:cx+xx*size,y:cy+y*size,z,size:p.size};
      }).sort((a,b)=>a.z-b.z);
      for (const p of projected) {
        const sweep = .5 + .5 * Math.sin(p.y/height*9-time*.001);
        const alpha=(.11+(p.z+1)*.24)*(.7+sweep*.3);
        ctx.fillStyle=`rgba(192,231,158,${alpha})`;
        ctx.beginPath();ctx.arc(p.x,p.y,p.size*(.8+(p.z+1)*.2),0,Math.PI*2);ctx.fill();
      }
    }
    function tick(now:number) {
      if(now-last>32){time+=Math.min(now-last,50);last=now;draw();}
      frame=requestAnimationFrame(tick);
    }
    function update() {
      cancelAnimationFrame(frame);draw();
      if(!paused&&!reduced.matches&&visible&&!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}
    }
    const resize=new ResizeObserver(()=>{
      width=canvas.clientWidth;height=canvas.clientHeight;
      const dpr=Math.min(devicePixelRatio||1,2);
      canvas.width=width*dpr;canvas.height=height*dpr;context.setTransform(dpr,0,0,dpr,0,0);draw();
    });
    const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;update();});
    resize.observe(canvas);intersection.observe(canvas);reduced.addEventListener('change',update);document.addEventListener('visibilitychange',update);update();
    return()=>{elapsed.current=time;cancelAnimationFrame(frame);resize.disconnect();intersection.disconnect();reduced.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);};
  }, [paused]);
  return <canvas ref={canvasRef} className="trace-canvas" aria-hidden="true" />;
}
