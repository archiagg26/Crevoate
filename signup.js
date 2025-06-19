document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.signup-form');
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    const togglePasswordButtons = document.querySelectorAll('.toggle-password');
    
    // Toggle password visibility
    togglePasswordButtons.forEach(button => {
        button.addEventListener('click', () => {
            const input = button.previousElementSibling.previousElementSibling;
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            button.classList.toggle('fa-eye');
            button.classList.toggle('fa-eye-slash');
        });
    });

    // Form validation
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const firstName = document.getElementById('firstname').value.trim();
        const lastName = document.getElementById('lastname').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // Reset previous error states
        clearErrors();
        
        // Validate fields
        let isValid = true;
        
        if (!firstName) {
            showError('firstname', 'First name is required');
            isValid = false;
        }
        
        if (!lastName) {
            showError('lastname', 'Last name is required');
            isValid = false;
        }
        
        if (!email) {
            showError('email', 'Email is required');
            isValid = false;
        } else if (!isValidEmail(email)) {
            showError('email', 'Please enter a valid email address');
            isValid = false;
        }
        
        if (!password) {
            showError('password', 'Password is required');
            isValid = false;
        } else if (password.length < 8) {
            showError('password', 'Password must be at least 8 characters long');
            isValid = false;
        }
        
        if (!confirmPassword) {
            showError('confirm-password', 'Please confirm your password');
            isValid = false;
        } else if (password !== confirmPassword) {
            showError('confirm-password', 'Passwords do not match');
            isValid = false;
        }
        
        if (isValid) {
            // Here you would typically send the form data to your server
            // For now, we'll just show a success message
            showSuccessMessage();
        }
    });

    // Input animations
    const inputs = document.querySelectorAll('.input-group input');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', () => {
            input.parentElement.classList.remove('focused');
            if (input.value.trim()) {
                input.classList.add('has-value');
            } else {
                input.classList.remove('has-value');
            }
        });
    });
});

// Helper functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.color = '#ff3b30';
    errorDiv.style.fontSize = '0.8rem';
    errorDiv.style.marginTop = '0.25rem';
    input.parentElement.appendChild(errorDiv);
    input.style.borderColor = '#ff3b30';
}

function clearErrors() {
    const errorMessages = document.querySelectorAll('.error-message');
    const inputs = document.querySelectorAll('.input-group input');
    
    errorMessages.forEach(error => error.remove());
    inputs.forEach(input => input.style.borderColor = '#eee');
}

function showSuccessMessage() {
    const form = document.querySelector('.signup-form');
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <i class="fas fa-check-circle" style="color: #28a745; font-size: 3rem;"></i>
            <h3 style="color: #28a745; margin: 1rem 0;">Account Created Successfully!</h3>
            <p style="color: #666;">Thank you for joining Creovate. Please check your email for verification.</p>
        </div>
    `;
    
    form.innerHTML = '';
    form.appendChild(successMessage);
    
    // Reset form after 3 seconds
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 3000);
}

// Social sign up buttons
const googleBtn = document.querySelector('.social-btn.google');
const githubBtn = document.querySelector('.social-btn.github');

if (googleBtn) {
    googleBtn.addEventListener('click', () => {
        // Implement Google Sign Up logic
        console.log('Google Sign Up clicked');
    });
}

if (githubBtn) {
    githubBtn.addEventListener('click', () => {
        // Implement GitHub Sign Up logic
        console.log('GitHub Sign Up clicked');
    });
} 