document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("veinCanvas");
  const ctx = canvas.getContext("2d");

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = document.getElementById("hero").offsetHeight || window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  // CLEAN, WELL-DEFINED VEIN PATHS (Modify these later to match your layout)
  const veins = [
    { p0:[100,400],  p1:[600,300],  p2:[1200,450] },
    { p0:[50,250],   p1:[700,200],  p2:[1400,350] },
    { p0:[200,550],  p1:[800,650],  p2:[1500,600] },
    { p0:[0,150],    p1:[500,80],   p2:[1300,200] },
    { p0:[300,700],  p1:[900,770],  p2:[1600,720] }
  ];

  // LUMENS FOLLOW PATHS PERFECTLY (Inside the line, like Terminal)
  const lumens = veins.map(() => ({
    t: Math.random(), 
    speed: 0.00025 + Math.random()*0.00045
  }));

  function bezier(p0,p1,p2,t){
    const x=(1-t)*(1-t)*p0[0] + 2*(1-t)*t*p1[0] + t*t*p2[0];
    const y=(1-t)*(1-t)*p0[1] + 2*(1-t)*t*p1[1] + t*t*p2[1];
    return {x,y};
  }

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Draw smooth elegant veins (thin, subtle)
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineCap = "round";
    veins.forEach(v=>{
      ctx.beginPath();
      ctx.moveTo(v.p0[0],v.p0[1]);
      ctx.quadraticCurveTo(v.p1[0],v.p1[1],v.p2[0],v.p2[1]);
      ctx.stroke();
    });

    // Render golden pill-lumens sliding *ON* the veins
    lumens.forEach((l,i)=>{
      l.t+=l.speed; if(l.t>1) l.t=0;
      const pos = bezier(veins[i].p0,veins[i].p1,veins[i].p2,l.t);

      ctx.save();
      ctx.translate(pos.x,pos.y);
      ctx.shadowColor="rgba(201,168,107,0.6)";
      ctx.shadowBlur=18;

      // pill shape glow
      ctx.fillStyle="rgba(201,168,107,0.95)";
      ctx.beginPath();
      ctx.ellipse(0,0,10,4,0,0,Math.PI*2); 
      ctx.fill();
      ctx.restore();
    });

    requestAnimationFrame(draw);
  }
  draw();
});
