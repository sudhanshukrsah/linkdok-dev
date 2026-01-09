import './MobileBlocker.css';

function MobileBlocker() {
  return (
    <div className="mobile-blocker">
      <video
        className="mobile-blocker-video"
        autoPlay
        loop
        muted
        playsInline
      >
        <source
          src="https://res.cloudinary.com/ddxxvy4ke/video/upload/v1767974403/mobile_uu0ftv.mp4"
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

export default MobileBlocker;
