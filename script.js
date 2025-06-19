// Mobile Menu Toggle
const menuBtn = document.querySelector('.menu-btn');
const navLinks = document.querySelector('.nav-links');

menuBtn.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    menuBtn.classList.toggle('fa-times');
});

// Close mobile menu when clicking a nav link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        menuBtn.classList.remove('fa-times');
    });
});

// Hero Slider Functionality
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');
let currentSlide = 0;
let slideInterval;

// Function to change slide
const changeSlide = (n) => {
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    
    currentSlide = (n + slides.length) % slides.length;
    
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
};

// Auto slide change
const startSlideShow = () => {
    slideInterval = setInterval(() => {
        changeSlide(currentSlide + 1);
    }, 5000); // Change slide every 5 seconds
};

// Stop auto slide on user interaction
const stopSlideShow = () => {
    clearInterval(slideInterval);
};

// Event listeners for controls
prevBtn.addEventListener('click', () => {
    stopSlideShow();
    changeSlide(currentSlide - 1);
    startSlideShow();
});

nextBtn.addEventListener('click', () => {
    stopSlideShow();
    changeSlide(currentSlide + 1);
    startSlideShow();
});

dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        stopSlideShow();
        changeSlide(index);
        startSlideShow();
    });
});

// Start the slideshow
startSlideShow();

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            window.scrollTo({
                top: target.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});

// Active navigation link on scroll
const sections = document.querySelectorAll('section');
const navItems = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollY >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href').slice(1) === current) {
            item.classList.add('active');
        }
    });
});

// Form submission
const contactForm = document.querySelector('.contact-form');

contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData);
    
    // Here you would typically send the data to a server
    // For now, we'll just show a success message
    alert('Thank you for your message! We will get back to you soon.');
    contactForm.reset();
});

// Reveal animations on scroll
const revealElements = document.querySelectorAll('.service-card, .work-item, .about-content');

const reveal = () => {
    revealElements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        if (elementTop < windowHeight - 150) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }
    });
};

// Initial styles for reveal elements
revealElements.forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(50px)';
    element.style.transition = 'all 0.6s ease';
});

window.addEventListener('scroll', reveal);
reveal(); // Initial check

// Theme Switcher
function initThemeSwitcher() {
    const toggleSwitch = document.querySelector('#checkbox');
    const sunIcon = document.querySelector('.fa-sun');
    const moonIcon = document.querySelector('.fa-moon');
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    toggleSwitch.checked = savedTheme === 'dark';
    
    // Initial icon state
    updateIcons(savedTheme === 'dark');
    
    toggleSwitch.addEventListener('change', function(e) {
        const isDark = e.target.checked;
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateIcons(isDark);
    });
    
    function updateIcons(isDark) {
        // Add transition effect to icons
        sunIcon.style.transform = isDark ? 'scale(0.8)' : 'scale(1)';
        moonIcon.style.transform = isDark ? 'scale(1)' : 'scale(0.8)';
        
        // Update colors
        sunIcon.style.color = isDark ? 'var(--text-color)' : 'var(--primary-color)';
        moonIcon.style.color = isDark ? 'var(--primary-color)' : 'var(--text-color)';
    }
}

// Initialize theme switcher
document.addEventListener('DOMContentLoaded', () => {
    initThemeSwitcher();
});

// Signup Modal Functionality
function openModal(type) {
    const body = document.body;
    let modalHTML = '';
    if (type === 'signup') {
        modalHTML = `
            <div class="signup-modal">
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <button class="close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                    <iframe src="signup.html" frameborder="0" style="overflow:hidden;"></iframe>
                </div>
            </div>
        `;
    } else if (type === 'login') {
        modalHTML = `
            <div class="signup-modal">
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <button class="close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                    <iframe src="login.html" frameborder="0" style="overflow:hidden;"></iframe>
                </div>
            </div>
        `;
    }
    body.insertAdjacentHTML('beforeend', modalHTML);
    body.style.overflow = 'hidden';
    setTimeout(() => {
        document.querySelector('.signup-modal').classList.add('active');
    }, 10);
    const closeBtn = document.querySelector('.close-modal');
    const modalOverlay = document.querySelector('.modal-overlay');
    function closeModal() {
        const modal = document.querySelector('.signup-modal');
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            body.style.overflow = '';
        }, 300);
    }
    closeBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    // Listen for cross-modal navigation
    setTimeout(() => {
        const iframe = document.querySelector('.modal-content iframe');
        if (!iframe) return;
        iframe.onload = function() {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            if (type === 'signup') {
                const loginLink = doc.querySelector('.login-link');
                if (loginLink) {
                    loginLink.addEventListener('click', function(e) {
                        e.preventDefault();
                        closeModal();
                        setTimeout(() => openModal('login'), 350);
                    });
                }
            } else if (type === 'login') {
                const signupLink = doc.querySelector('.signup-link');
                if (signupLink) {
                    signupLink.addEventListener('click', function(e) {
                        e.preventDefault();
                        closeModal();
                        setTimeout(() => openModal('signup'), 350);
                    });
                }
            }
        };
    }, 100);
}

function initSignupModal() {
    const signupBtn = document.querySelector('.signup-btn');
    signupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('signup');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initThemeSwitcher();
    initSignupModal();
});

// =====================
// Testimonials Carousel
// =====================
const testimonialCards = document.querySelectorAll('.testimonial-card');
const testimonialDots = document.querySelectorAll('.testimonials-dot');
const testimonialPrev = document.getElementById('testimonial-prev');
const testimonialNext = document.getElementById('testimonial-next');
let currentTestimonial = 0;
let testimonialInterval;

function showTestimonial(n) {
    testimonialCards.forEach((card, i) => {
        card.classList.toggle('active', i === n);
    });
    testimonialDots.forEach((dot, i) => {
        dot.classList.toggle('active', i === n);
    });
    currentTestimonial = n;
}

function nextTestimonial() {
    let next = (currentTestimonial + 1) % testimonialCards.length;
    showTestimonial(next);
}

function prevTestimonial() {
    let prev = (currentTestimonial - 1 + testimonialCards.length) % testimonialCards.length;
    showTestimonial(prev);
}

function startTestimonialAuto() {
    testimonialInterval = setInterval(nextTestimonial, 6000);
}

function stopTestimonialAuto() {
    clearInterval(testimonialInterval);
}

// Event listeners
if (testimonialPrev && testimonialNext) {
    testimonialPrev.addEventListener('click', () => {
        stopTestimonialAuto();
        prevTestimonial();
        startTestimonialAuto();
    });
    testimonialNext.addEventListener('click', () => {
        stopTestimonialAuto();
        nextTestimonial();
        startTestimonialAuto();
    });
}

testimonialDots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
        stopTestimonialAuto();
        showTestimonial(idx);
        startTestimonialAuto();
    });
});

// Pause on hover
const testimonialsCarousel = document.querySelector('.testimonials-carousel');
if (testimonialsCarousel) {
    testimonialsCarousel.addEventListener('mouseenter', stopTestimonialAuto);
    testimonialsCarousel.addEventListener('mouseleave', startTestimonialAuto);
}

// Initialize
showTestimonial(0);
startTestimonialAuto();

// Our Tools Section Interactivity
const toolsTabs = document.querySelectorAll('.tools-tab');
const toolsOptionsGroups = {
    uiux: document.getElementById('tools-options-uiux'),
    web: document.getElementById('tools-options-web'),
    influencer: document.getElementById('tools-options-influencer')
};

if (toolsTabs.length) {
    toolsTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Tab active state
            toolsTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            // Show relevant options
            Object.keys(toolsOptionsGroups).forEach(key => {
                toolsOptionsGroups[key].style.display = 'none';
            });
            const service = this.getAttribute('data-service');
            if (toolsOptionsGroups[service]) {
                toolsOptionsGroups[service].style.display = 'flex';
            }
        });
    });
    // Option active state
    Object.values(toolsOptionsGroups).forEach(group => {
        const options = group.querySelectorAll('.tools-option');
        options.forEach(option => {
            option.addEventListener('click', function() {
                options.forEach(o => o.classList.remove('active'));
                this.classList.add('active');
            });
        });
    });
}

// Impact Bar Graph (Custom Canvas Drawing)
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('impactBarChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Data
    const data = [
        { label: 'User Growth', value: 92, color: 'linear-gradient(90deg, #6C63FF 60%, #00C9A7 100%)', solid: '#6C63FF' },
        { label: 'Engagement %', value: 87, color: 'linear-gradient(90deg, #FF6584 60%, #FFB347 100%)', solid: '#FF6584' },
        { label: 'Influencer Reach', value: 95, color: 'linear-gradient(90deg, #00C9A7 60%, #6C63FF 100%)', solid: '#00C9A7' },
        { label: 'Website Conversions', value: 78, color: 'linear-gradient(90deg, #FFB347 60%, #FF6584 100%)', solid: '#FFB347' },
    ];
    const maxValue = 100;
    const barWidth = 80;
    const barGap = 60;
    const chartHeight = 220;
    const chartTop = 60;
    const chartLeft = 80;
    const radius = 18;
    const font = "600 1.1rem 'Inter', 'Poppins', sans-serif";

    function getBarGradient(ctx, x, y, w, h, idx) {
        let grad;
        switch(idx) {
            case 0:
                grad = ctx.createLinearGradient(x, y, x + w, y);
                grad.addColorStop(0, '#6C63FF');
                grad.addColorStop(1, '#00C9A7');
                break;
            case 1:
                grad = ctx.createLinearGradient(x, y, x + w, y);
                grad.addColorStop(0, '#FF6584');
                grad.addColorStop(1, '#FFB347');
                break;
            case 2:
                grad = ctx.createLinearGradient(x, y, x + w, y);
                grad.addColorStop(0, '#00C9A7');
                grad.addColorStop(1, '#6C63FF');
                break;
            case 3:
                grad = ctx.createLinearGradient(x, y, x + w, y);
                grad.addColorStop(0, '#FFB347');
                grad.addColorStop(1, '#FF6584');
                break;
            default:
                grad = ctx.createLinearGradient(x, y, x + w, y);
                grad.addColorStop(0, '#6C63FF');
                grad.addColorStop(1, '#00C9A7');
        }
        return grad;
    }

    function drawBar(ctx, x, y, w, h, r, grad) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(108,99,255,0.18)';
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.restore();
    }

    function drawChart(animPerc = 1) {
        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Axis
        ctx.save();
        ctx.strokeStyle = 'rgba(180,180,220,0.18)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(chartLeft - 20, chartTop - 10);
        ctx.lineTo(chartLeft - 20, chartTop + chartHeight + 10);
        ctx.lineTo(canvas.width - 40, chartTop + chartHeight + 10);
        ctx.stroke();
        ctx.restore();
        // Bars
        data.forEach((d, i) => {
            const x = chartLeft + i * (barWidth + barGap);
            const barH = Math.round((d.value / maxValue) * chartHeight * animPerc);
            const y = chartTop + chartHeight - barH;
            const grad = getBarGradient(ctx, x, y, barWidth, barH, i);
            drawBar(ctx, x, y, barWidth, barH, radius, grad);
            // Value label
            ctx.save();
            ctx.font = font;
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--primary-color') || '#6C63FF';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.10)';
            ctx.shadowBlur = 2;
            ctx.fillText(d.value + (d.label === 'Engagement %' ? '%' : ''), x + barWidth / 2, y - 12);
            ctx.restore();
            // Label
            ctx.save();
            ctx.font = "500 1rem 'Inter', 'Poppins', sans-serif";
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-color') || '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(d.label, x + barWidth / 2, chartTop + chartHeight + 32);
            ctx.restore();
        });
    }

    // Animate bars
    let start;
    function animateBars(ts) {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / 900, 1);
        drawChart(progress);
        if (progress < 1) {
            requestAnimationFrame(animateBars);
        }
    }
    requestAnimationFrame(animateBars);

    // Redraw on theme change
    const observer = new MutationObserver(() => {
        drawChart(1);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
});

// Loader overlay hide after 2 seconds
window.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loader-overlay');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('hide');
            setTimeout(() => loader.remove(), 600);
        }, 2000);
    }
}); 