export default function SceneBackgroundPng() {
  return (
    <div className="scene-bg" aria-hidden="true">
      <div className="scene-sky" />

      {/* 雲（任意） */}
      <div className="scene-layer scene-clouds">
        <div className="scene-track">
          <img className="scene-strip" src="/bg/clouds.png" alt="" />
          <img className="scene-strip" src="/bg/clouds.png" alt="" />
        </div>
      </div>

      {/* 街並み */}
      <div className="scene-layer scene-city">
        <div className="scene-track">
          <img className="scene-strip" src="../bg/city.png" alt="" />
          <img className="scene-strip" src="/bg/city.png" alt="" />
        </div>
      </div>

      {/* 車 */}
      <div className="scene-layer scene-cars">
        <div className="scene-track">
          <img className="scene-strip" src="../bg/cars.png" alt="" />
          <img className="scene-strip" src="/bg/cars.png" alt="" />
        </div>
      </div>
    </div>
  );
}
