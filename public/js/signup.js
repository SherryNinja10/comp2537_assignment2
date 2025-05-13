const signupForm = document.getElementById('signupForm');

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    const data = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const text = await response.text();
        const result = text ? JSON.parse(text) : {};
        
        if (response.ok) {
            alert(result.message);
            window.location.href = '/memberspage';
        } else {
            // Show specific error from server if available
            alert(result.error || 'Something went wrong. Please try again.');
        }        
    } catch (error) {
        alert('Network error. Please try again.');
        console.error(error);
    }
});

