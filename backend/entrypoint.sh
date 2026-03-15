#!/bin/bash
set -e

mkdir -p /app/images

cd /app/build
exec ./blog_backend
