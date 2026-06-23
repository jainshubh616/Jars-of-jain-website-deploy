        // ─── Improvement #6: Smart Loading Screen ──────────────────────────
        (function () {
            const loader = document.getElementById('loader');
            const heroImg = document.querySelector('.hero__media img');

            // Wait for actual image load OR 800ms cap, whichever comes first
            const imageLoaded = new Promise(resolve => {
                if (heroImg.complete) { resolve(); return; }
                heroImg.addEventListener('load', resolve);
                heroImg.addEventListener('error', resolve);
            });

            const timeout = new Promise(resolve => setTimeout(resolve, 800));

            Promise.race([imageLoaded, timeout]).then(() => {
                // Small buffer to let CSS animation finish
                setTimeout(() => {
                    loader.classList.add('hidden');
                    document.querySelector('.hero').classList.add('loaded');
                    // Initialize char animation after loader hides
                    splitHeroTitle();
                }, 100);
            });
        })();

        // ─── Improvement #2: Character Split Animation ──────────────────────────
        function splitHeroTitle() {
            const title = document.getElementById('heroTitle');
            if (!title) return;

            // Get the text node (first child, "Heritage")
            const textNodes = [];
            title.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                    textNodes.push(node);
                }
            });

            textNodes.forEach(textNode => {
                const text = textNode.textContent.trim();
                const wrapper = document.createElement('span');
                wrapper.style.display = 'inline-block';
                wrapper.style.perspective = '600px';

                text.split('').forEach((char, i) => {
                    const span = document.createElement('span');
                    span.className = 'char';
                    span.textContent = char === ' ' ? '\u00A0' : char;
                    span.style.animationDelay = `${0.5 + i * 0.06}s`;
                    wrapper.appendChild(span);
                });

                textNode.parentNode.replaceChild(wrapper, textNode);
            });
        }

        // ─── Improvement #3: Lenis Smooth Scroll ──────────────────────────
        let lenis;
        try {
            lenis = new Lenis({
                duration: 1.0,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                orientation: 'vertical',
                gestureOrientation: 'vertical',
                smoothWheel: true,
                wheelMultiplier: 1.1,
                touchMultiplier: 1.8,
                infinite: false,
                lerp: 0.1,
                syncTouch: true,
                syncTouchLerp: 0.075,
            });
        } catch (e) {
            // Lenis CDN not loaded, fallback to native
            lenis = null;
        }

        // ─── Improvement #5: Unified Scroll Handler ──────────────────────────
        const scrollProgress = document.getElementById('scrollProgress');
        const navbar = document.getElementById('navbar');
        const parallaxBg = document.getElementById('parallaxBg');
        const quoteSection = document.getElementById('quote');
        const heroMedia = document.querySelector('.hero__media img');
        const heroContent = document.querySelector('.hero__content');
        const heroSection = document.querySelector('.hero');

        // Cache viewport dimensions — update on resize
        let cachedVH = window.innerHeight;
        let cachedDocHeight = document.documentElement.scrollHeight;
        let lastNavbarScrolled = false;
        let lastProgressWidth = '';

        window.addEventListener('resize', () => {
            cachedVH = window.innerHeight;
            cachedDocHeight = document.documentElement.scrollHeight;
        }, { passive: true });

        function onScroll(scrollData) {
            const scrollTop = scrollData ? scrollData.scroll : window.scrollY;
            const maxScroll = scrollData ? scrollData.limit : (cachedDocHeight - cachedVH);

            // 1. Scroll progress bar — only update if changed
            const progress = ((scrollTop / maxScroll) * 100).toFixed(1) + '%';
            if (progress !== lastProgressWidth) {
                scrollProgress.style.width = progress;
                lastProgressWidth = progress;
            }

            // 2. Navbar scroll effect — only toggle if state changed
            const shouldBeScrolled = scrollTop > 80;
            if (shouldBeScrolled !== lastNavbarScrolled) {
                navbar.classList.toggle('scrolled', shouldBeScrolled);
                lastNavbarScrolled = shouldBeScrolled;
            }

            // 3. Parallax on quote section — use translate3d for GPU acceleration
            if (quoteSection && parallaxBg) {
                const rect = quoteSection.getBoundingClientRect();
                // Only compute if section is near viewport
                if (rect.bottom > -200 && rect.top < cachedVH + 200) {
                    const sectionCenter = rect.top + rect.height * 0.5;
                    const offset = (sectionCenter - cachedVH * 0.5) * 0.15;
                    parallaxBg.style.transform = `translate3d(0, ${offset}px, 0)`;
                }
            }

            // 4. Hero parallax — only when hero is visible, use translate3d
            if (heroSection && heroMedia && heroContent) {
                const heroHeight = heroSection.offsetHeight;
                if (scrollTop < heroHeight) {
                    const parallaxVal = scrollTop * 0.12;
                    heroMedia.style.transform = `translate3d(0, ${parallaxVal}px, 0) scale(${1 + scrollTop * 0.0001})`;
                    heroContent.style.transform = `translate3d(0, ${scrollTop * 0.2}px, 0)`;
                    heroContent.style.opacity = Math.max(0, 1 - (scrollTop / heroHeight) * 1.2);
                }
            }

            // 5. Word reveal on quote (Improvement #10)
            handleWordReveal();
        }

        if (lenis) {
            lenis.on('scroll', (e) => {
                onScroll({ scroll: e.scroll, limit: e.limit });
            });

            function raf(time) {
                lenis.raf(time);
                requestAnimationFrame(raf);
            }
            requestAnimationFrame(raf);
        } else {
            // Fallback: single scroll listener with rAF throttle
            let ticking = false;
            window.addEventListener('scroll', () => {
                if (!ticking) {
                    requestAnimationFrame(() => {
                        onScroll(null);
                        ticking = false;
                    });
                    ticking = true;
                }
            });
        }

        // ─── Custom Cursor ──────────────────────────
        const cursorDot = document.getElementById('cursorDot');
        const cursorRing = document.getElementById('cursorRing');
        let mouseX = 0, mouseY = 0;
        let ringX = 0, ringY = 0;
        let cursorVisible = false;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            // Use transform instead of left/top for GPU-accelerated positioning
            cursorDot.style.transform = `translate3d(${mouseX - 4}px, ${mouseY - 4}px, 0)`;
            if (!cursorVisible) {
                cursorVisible = true;
                cursorDot.style.opacity = '1';
                cursorRing.style.opacity = '0.5';
            }
        }, { passive: true });

        function animateRing() {
            ringX += (mouseX - ringX) * 0.12;
            ringY += (mouseY - ringY) * 0.12;
            // Use transform instead of left/top for GPU-accelerated positioning
            cursorRing.style.transform = `translate3d(${ringX - 20}px, ${ringY - 20}px, 0)`;
            requestAnimationFrame(animateRing);
        }
        animateRing();

        // Hover effect on interactive elements
        const hoverTargets = document.querySelectorAll('a, button, .origin__image-frame, .craft__product-image');
        hoverTargets.forEach(el => {
            el.addEventListener('mouseenter', () => cursorRing.classList.add('hovering'));
            el.addEventListener('mouseleave', () => cursorRing.classList.remove('hovering'));
        });

        // ─── Improvement #11: Cursor Click Pulse ──────────────────────────
        document.addEventListener('mousedown', () => {
            cursorDot.classList.add('clicking');
            cursorRing.classList.add('clicking');
        });
        document.addEventListener('mouseup', () => {
            cursorDot.classList.remove('clicking');
            cursorRing.classList.remove('clicking');
        });

        // ─── Intersection Observer for Reveals ──────────────────────────
        const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        });

        revealElements.forEach(el => revealObserver.observe(el));

        // ─── Smooth Anchor Scrolling (uses Lenis) ──────────────────────────
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const href = this.getAttribute('href');
                if (href === '#') return;
                const target = document.querySelector(href);
                if (target) {
                    if (lenis) {
                        lenis.scrollTo(target, { offset: 0, duration: 1.5 });
                    } else {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    // Close mobile menu if open
                    closeMobileMenu();
                }
            });
        });

        // ─── Improvement #1: Magnetic Buttons ──────────────────────────
        class MagneticButton {
            constructor(el) {
                this.el = el;
                this.boundingRect = null;
                this.strength = 25; // Maximum pixel offset

                this.el.addEventListener('mouseenter', () => this.onEnter());
                this.el.addEventListener('mousemove', (e) => this.onMove(e));
                this.el.addEventListener('mouseleave', () => this.onLeave());
            }

            onEnter() {
                this.boundingRect = this.el.getBoundingClientRect();
            }

            onMove(e) {
                if (!this.boundingRect) return;
                const centerX = this.boundingRect.left + this.boundingRect.width / 2;
                const centerY = this.boundingRect.top + this.boundingRect.height / 2;
                const deltaX = (e.clientX - centerX) / (this.boundingRect.width / 2);
                const deltaY = (e.clientY - centerY) / (this.boundingRect.height / 2);

                const tx = deltaX * this.strength;
                const ty = deltaY * this.strength;

                this.el.style.transform = `translate(${tx}px, ${ty}px)`;
            }

            onLeave() {
                this.el.style.transform = 'translate(0, 0)';
                this.boundingRect = null;
            }
        }

        // Initialize magnetic buttons
        document.querySelectorAll('.magnetic-btn').forEach(btn => {
            new MagneticButton(btn);
        });

        // ─── Improvement #9: Mobile Menu Logic ──────────────────────────
        const hamburger = document.getElementById('hamburger');
        const mobileMenu = document.getElementById('mobileMenu');
        let menuOpen = false;

        function openMobileMenu() {
            menuOpen = true;
            hamburger.classList.add('active');
            mobileMenu.classList.add('open');
            document.body.style.overflow = 'hidden';
            if (lenis) lenis.stop();
        }

        function closeMobileMenu() {
            menuOpen = false;
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('open');
            document.body.style.overflow = '';
            if (lenis) lenis.start();
        }

        hamburger.addEventListener('click', () => {
            if (menuOpen) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });

        // Close menu on link click
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && href !== '#') {
                    e.preventDefault();
                    closeMobileMenu();
                    setTimeout(() => {
                        const target = document.querySelector(href);
                        if (target) {
                            if (lenis) {
                                lenis.scrollTo(target, { offset: 0, duration: 1.5 });
                            } else {
                                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }
                    }, 300);
                }
            });
        });

        // Close menu on outside click (on overlay background)
        mobileMenu.addEventListener('click', (e) => {
            if (e.target === mobileMenu) closeMobileMenu();
        });

        // ─── Improvement #10: Scroll-triggered Word Reveal on Quote ──────────────────────────
        (function () {
            const quoteText = document.getElementById('quoteText');
            if (!quoteText) return;

            const rawText = quoteText.textContent.trim();
            quoteText.innerHTML = '';

            rawText.split(/\s+/).forEach((word, i) => {
                const span = document.createElement('span');
                span.className = 'word';
                span.textContent = word;
                span.dataset.index = i;
                quoteText.appendChild(span);
                // Add space after each word
                quoteText.appendChild(document.createTextNode(' '));
            });
        })();

        const quoteWords = document.querySelectorAll('.parallax-quote__text .word');
        const totalWords = quoteWords.length;

        let lastWordsRevealed = -1;
        function handleWordReveal() {
            if (!quoteSection || !totalWords) return;
            const rect = quoteSection.getBoundingClientRect();

            // Skip if section is far from viewport
            if (rect.bottom < -100 || rect.top > cachedVH + 100) return;

            const sectionProgress = 1 - (rect.top / cachedVH);
            const revealStart = 0.2;
            const revealEnd = 1.0;
            const clampedProgress = Math.max(0, Math.min(1, (sectionProgress - revealStart) / (revealEnd - revealStart)));

            const wordsToReveal = Math.floor(clampedProgress * totalWords);

            // Only update DOM if the count actually changed
            if (wordsToReveal === lastWordsRevealed) return;
            lastWordsRevealed = wordsToReveal;

            quoteWords.forEach((word, i) => {
                if (i < wordsToReveal) {
                    word.classList.add('revealed');
                } else {
                    word.classList.remove('revealed');
                }
            });
        }

        // ─── Improvement #8: Scroll-triggered Color Reveal ──────────────────────────
        const grayscaleImages = document.querySelectorAll('.grayscale-img');
        const colorRevealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Delay the reveal slightly for a "moment of delight"
                    setTimeout(() => {
                        entry.target.classList.add('color-revealed');
                    }, 400);
                }
            });
        }, {
            threshold: 0.5,
            rootMargin: '0px 0px -100px 0px'
        });

        grayscaleImages.forEach(img => colorRevealObserver.observe(img));

        // ─── Improvement #14: Animated Stat Counters ──────────────────────────
        const counters = document.querySelectorAll('.counter');
        let countersAnimated = false;

        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !countersAnimated) {
                    countersAnimated = true;
                    animateCounters();
                }
            });
        }, {
            threshold: 0.3
        });

        counters.forEach(counter => counterObserver.observe(counter));

        function animateCounters() {
            counters.forEach(counter => {
                const target = parseInt(counter.dataset.target);
                const suffix = counter.dataset.suffix || '';
                const duration = 1800;
                const startTime = performance.now();

                function updateCounter(now) {
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    // Ease out quart
                    const eased = 1 - Math.pow(1 - progress, 4);
                    const current = Math.round(eased * target);

                    counter.textContent = current + suffix;

                    if (progress < 1) {
                        requestAnimationFrame(updateCounter);
                    }
                }

                requestAnimationFrame(updateCounter);
            });
        }
// ================================================================
// CUSTOMER REVIEWS LOGIC (GOOGLE SHEETS via Apps Script)
// ================================================================

const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbxT3tBrhmx13f0RYQBm_lyvETpzuwvME8t4B4YkAGt3XCPJDro9c8PNaXpuxA8DyQ1hGw/exec';

// Products available on this page (used to filter reviews)
const PAGE_PRODUCTS = ['Mathri', 'Gol Mathri', 'Kela Namkeen', 'Jiravan'];

document.addEventListener('DOMContentLoaded', () => {
    initStarSelector();
    fetchAndRenderReviews();
});

// ==========================================
// 1. FETCH & DISPLAY REVIEWS
// ==========================================
async function fetchAndRenderReviews() {
    try {
        const response = await fetch(SHEETS_API_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        const allReviews = await response.json();

        // Filter reviews so visitors only see reviews matching the current page's product IDs
        const filteredReviews = Array.isArray(allReviews)
            ? allReviews.filter(r => {
                const pid = r.ProductID || r.productId || r.product || '';
                return PAGE_PRODUCTS.includes(pid);
            })
            : [];

        renderReviews(filteredReviews);
        calculateAndRenderProductRatings(filteredReviews);
        injectSEOSchema(filteredReviews);

    } catch (err) {
        console.error('Error fetching reviews:', err);
        document.getElementById('reviews-grid').innerHTML = '<div style="text-align: center; grid-column: 1 / -1; color: var(--color-warm-gray);">Unable to load customer stories right now.</div>';
    }
}

function renderReviews(reviews) {
    const grid = document.getElementById('reviews-grid');
    grid.innerHTML = '';

    if (!reviews || reviews.length === 0) {
        grid.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; color: var(--color-warm-gray); font-style: italic;">No customer stories yet. Be the first to share your experience!</div>';
        return;
    }

    reviews.forEach((review, index) => {
        // Map fields from Google Sheets response
        const name = review.Name || review.customer_name || 'Customer';
        const rating = parseInt(review.StarRating || review.Rating || review.rating || 5);
        const comment = review.Comment || review.review_text || '';
        const product = review.ProductID || review.product || '';
        const timestamp = review.Timestamp || review.created_at || '';

        const dateStr = timestamp
            ? new Date(timestamp).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
            : '';
        const initial = name.charAt(0).toUpperCase();

        const card = document.createElement('div');
        card.className = 'customer-review-card reveal';
        card.style.setProperty('--i', index);

        card.innerHTML = `
            <div class="review-card-header">
                <div class="reviewer-info">
                    <div class="reviewer-avatar">${initial}</div>
                    <div class="reviewer-details">
                        <h4>${name} <span class="material-symbols-outlined verified-badge" title="Verified Buyer">verified</span></h4>
                        ${dateStr ? `<div class="review-date">${dateStr}</div>` : ''}
                    </div>
                </div>
            </div>
            <div class="review-stars">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</div>
            <div class="review-product-badge">${product}</div>
            <div class="review-body">${comment}</div>
        `;

        grid.appendChild(card);
    });

    // Re-trigger reveal animation if they exist
    setTimeout(() => {
        const reveals = grid.querySelectorAll('.reveal');
        reveals.forEach(r => r.classList.add('visible'));
    }, 100);
}

// ==========================================
// 2. RATING SUMMARY & PRODUCT CARDS
// ==========================================
function calculateAndRenderProductRatings(reviews) {
    let totalScore = 0;
    const productStats = {
        'Mathri': { total: 0, count: 0 },
        'Gol Mathri': { total: 0, count: 0 },
        'Kela Namkeen': { total: 0, count: 0 },
        'Jiravan': { total: 0, count: 0 },
    };

    const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    reviews.forEach(r => {
        const rating = parseInt(r.StarRating || r.Rating || r.rating || 0);
        const product = r.ProductID || r.product || '';
        totalScore += rating;
        if (starCounts[rating] !== undefined) starCounts[rating]++;
        if (productStats[product]) {
            productStats[product].total += rating;
            productStats[product].count++;
        }
    });

    const totalReviews = reviews.length;
    const avgScore = totalReviews > 0 ? (totalScore / totalReviews).toFixed(1) : 0;

    // Update Overall Summary
    document.getElementById('overall-score').textContent = avgScore > 0 ? avgScore : '--';
    document.getElementById('total-reviews-count').textContent = totalReviews + ' Reviews';
    document.getElementById('overall-stars').textContent = '★'.repeat(Math.round(avgScore)) + '☆'.repeat(5 - Math.round(avgScore));

    // Update Rating Bars
    const barsContainer = document.getElementById('rating-bars');
    barsContainer.innerHTML = '';
    for (let i = 5; i >= 1; i--) {
        const count = starCounts[i];
        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
        barsContainer.innerHTML += `
            <div class="rating-bar-row">
                <span>${i} Star</span>
                <div class="bar-container">
                    <div class="bar-fill" style="width: 0%"></div>
                </div>
                <span style="text-align: right;">${count}</span>
            </div>
        `;
        // Animate fill
        setTimeout(() => {
            const fills = barsContainer.querySelectorAll('.bar-fill');
            if(fills[5-i]) fills[5-i].style.width = percentage + '%';
        }, 100);
    }

    // Update individual product cards
    document.querySelectorAll('.product-rating').forEach(el => {
        const prod = el.getAttribute('data-product');
        if (productStats[prod]) {
            const stats = productStats[prod];
            const avg = stats.count > 0 ? (stats.total / stats.count).toFixed(1) : 0;
            const starsEl = el.querySelector('.stars');
            const scoreEl = el.querySelector('.rating-score');
            const countEl = el.querySelector('.review-count');

            if(avg > 0) {
                starsEl.textContent = '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg));
                scoreEl.textContent = avg;
                countEl.textContent = '(' + stats.count + ' Reviews)';
            }

            countEl.addEventListener('click', () => {
                document.getElementById('reviews').scrollIntoView({ behavior: 'smooth' });
            });
        }
    });
}

// ==========================================
// 3. SUBMIT REVIEW LOGIC
// ==========================================
const reviewForm = document.getElementById('reviewForm');
const reviewMessage = document.getElementById('reviewMessage');
const submitReviewBtn = document.getElementById('submitReviewBtn');

function openReviewModal() {
    document.getElementById('reviewModal').classList.add('active');
}

function closeReviewModal() {
    document.getElementById('reviewModal').classList.remove('active');
    reviewForm.reset();
    document.getElementById('reviewRating').value = '';
    updateStarSelection(0);
    reviewMessage.textContent = '';
}

function initStarSelector() {
    const stars = document.querySelectorAll('#starSelector span');
    const hiddenInput = document.getElementById('reviewRating');

    stars.forEach(star => {
        star.addEventListener('click', (e) => {
            const val = e.target.getAttribute('data-value');
            hiddenInput.value = val;
            updateStarSelection(val);
        });
    });
}

function updateStarSelection(value) {
    const stars = document.querySelectorAll('#starSelector span');
    stars.forEach(s => {
        if (parseInt(s.getAttribute('data-value')) <= value) {
            s.classList.add('active');
            s.textContent = '★';
        } else {
            s.classList.remove('active');
            s.textContent = '☆';
        }
    });
}

reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rating = document.getElementById('reviewRating').value;
    if (!rating) {
        reviewMessage.style.color = 'red';
        reviewMessage.textContent = 'Please select a star rating.';
        return;
    }

    submitReviewBtn.disabled = true;
    submitReviewBtn.innerHTML = '<span class="loader-spinner"></span> Submitting...';
    reviewMessage.textContent = '';

    try {
        // Build the review payload — field names MUST match the Apps Script doPost():
        // params.name, params.rating, params.comment, params.productId, params.phone
        const reviewData = {
            name: document.getElementById('reviewName').value,
            rating: parseInt(rating),
            comment: document.getElementById('reviewText').value,
            productId: document.getElementById('reviewProduct').value
        };

        // Include phone number if provided (optional field)
        const phone = document.getElementById('reviewPhone').value;
        if (phone) {
            reviewData.phone = phone;
        }

        // POST JSON to Google Sheets via Apps Script
        // Content-Type: text/plain with mode: no-cors is a "simple request" so
        // the browser sends the body without a CORS preflight, and Apps Script
        // reads it via e.postData.contents → JSON.parse()
        await fetch(SHEETS_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(reviewData)
        });

        // With mode: 'no-cors' we can't read the response, but if no error was thrown it went through
        reviewForm.reset();
        updateStarSelection(0);

        reviewMessage.style.color = 'green';
        reviewMessage.textContent = 'Thank you! Your review has been submitted successfully.';

        // Refresh the reviews list after a short delay
        setTimeout(() => {
            fetchAndRenderReviews();
        }, 2000);

        setTimeout(() => {
            closeReviewModal();
        }, 3000);

    } catch (err) {
        console.error('Submission error:', err);
        reviewMessage.style.color = 'red';
        reviewMessage.textContent = 'Failed to submit review. Please try again.';
    } finally {
        submitReviewBtn.disabled = false;
        submitReviewBtn.textContent = 'Submit Review';
    }
});

// ==========================================
// 4. SEO JSON-LD INJECTION
// ==========================================
function injectSEOSchema(reviews) {
    if (!reviews || reviews.length === 0) return;

    let totalScore = 0;
    reviews.forEach(r => totalScore += parseInt(r.StarRating || r.Rating || r.rating || 0));
    const avgScore = (totalScore / reviews.length).toFixed(1);

    const schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Jars of Jain Traditional Snacks",
        "image": "https://jarsofjain.com/images/hero.png",
        "description": "Premium handcrafted traditional Indian snacks and spices including Mathri, Kela Namkeen, and Jiravan.",
        "brand": {
            "@type": "Brand",
            "name": "Jars of Jain"
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": avgScore,
            "reviewCount": reviews.length.toString(),
            "bestRating": "5",
            "worstRating": "1"
        },
        "review": reviews.map(r => ({
            "@type": "Review",
            "reviewRating": {
                "@type": "Rating",
                "ratingValue": (r.StarRating || r.Rating || r.rating || 0).toString(),
                "bestRating": "5",
                "worstRating": "1"
            },
            "author": {
                "@type": "Person",
                "name": r.Name || r.customer_name || 'Customer'
            },
            "reviewBody": r.Comment || r.review_text || '',
            "datePublished": r.Timestamp || r.created_at || ''
        }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
}
