# Use a lightweight Python image
FROM python:3.11

# The absolute fastest way to install uv: copy the compiled binary directly from Astral
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set the working directory
WORKDIR /app

# Ensure Python output is sent straight to terminal (e.g. your container log)
# without being first buffered and that you can see the output of your application in real time
ENV PYTHONUNBUFFERED=1
# Step 1: Copy ONLY the dependency files first.
# This tells Docker to cache this layer. If you only change main.py later, 
# Docker skips the installation step entirely, making rebuilds instant!
COPY pyproject.toml uv.lock ./

# Step 2: Install dependencies using uv.
# --frozen ensures it uses exact versions from the lockfile.
# --no-install-project tells it not to look for a full python package build, just the dependencies.
RUN uv sync --frozen --no-install-project

# Step 3: Copy your actual code
COPY main.py .

# Step 4: Run the script continuously
# Using `uv run` automatically handles the virtual environment inside the container
CMD ["uv", "run", "main.py"]