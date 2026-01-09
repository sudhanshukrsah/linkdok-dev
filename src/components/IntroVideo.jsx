import { useState, useRef, useEffect } from 'react';
import './IntroVideo.css';

function IntroVideo({ onComplete }) {
  const [showButton, setShowButton] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVideoEnd = () => {
      setShowButton(true);
    };

    video.addEventListener('ended', handleVideoEnd);

    return () => {
      video.removeEventListener('ended', handleVideoEnd);
    };
  }, []);

  const handleGetStarted = () => {
    setIsExiting(true);
    // Wait for animation to complete before calling onComplete
    setTimeout(() => {
      onComplete();
    }, 600);
  };

  return (
    <div className={`intro-video-overlay ${isExiting ? 'exiting' : ''}`}>
      <video
        ref={videoRef}
        className="intro-video"
        autoPlay
        muted
        playsInline
      >
        <source
          src="https://res.cloudinary.com/ddxxvy4ke/video/upload/v1767966807/Add_Your_Resource_Link_scb8xl.mp4"
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>

      {showButton && (
        <button 
          className="get-started-btn"
          onClick={handleGetStarted}
        >
          Get Started
        </button>
      )}
    </div>
  );
}

export default IntroVideo;
