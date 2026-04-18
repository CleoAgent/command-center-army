import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';

export default function PhaserBg() {
  const gameRef = useRef(null);

  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      parent: gameRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      transparent: true,
      physics: { default: 'arcade' },
      scene: {
        create: function () {
          const width = this.cameras.main.width;
          const height = this.cameras.main.height;

          // Tactical Grid
          this.add.grid(width / 2, height / 2, width, height, 40, 40, 0x000000, 0, 0x06b6d4, 0.05);

          // Radar Circle
          const cx = width / 2;
          const cy = height / 2;
          
          this.graphics = this.add.graphics();
          this.graphics.lineStyle(1, 0x06b6d4, 0.2);
          this.graphics.strokeCircle(cx, cy, 200);
          this.graphics.strokeCircle(cx, cy, 400);
          this.graphics.strokeCircle(cx, cy, 600);

          // Radar Sweep Line
          this.sweep = this.add.graphics();
          this.angle = 0;
        },
        update: function () {
          const cx = this.cameras.main.width / 2;
          const cy = this.cameras.main.height / 2;
          
          this.sweep.clear();
          this.sweep.lineStyle(2, 0x10b981, 0.8);
          this.sweep.beginPath();
          this.sweep.moveTo(cx, cy);
          this.sweep.lineTo(cx + Math.cos(this.angle) * 800, cy + Math.sin(this.angle) * 800);
          this.sweep.strokePath();

          // Radar trailing gradient effect hack (simple visual)
          this.sweep.fillStyle(0x10b981, 0.1);
          this.sweep.slice(cx, cy, 800, this.angle - 0.2, this.angle, false);
          this.sweep.fillPath();

          this.angle += 0.02;
        }
      }
    };

    const game = new Phaser.Game(config);

    const handleResize = () => {
      game.scale.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      game.destroy(true);
    };
  }, []);

  return <div ref={gameRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: -1, pointerEvents: 'none' }} />;
}
