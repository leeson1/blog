FROM drogonframework/drogon:latest AS builder
WORKDIR /app
COPY CMakeLists.txt .
COPY src ./src
RUN mkdir build && cd build && cmake .. -DCMAKE_BUILD_TYPE=Release && make -j$(nproc)

FROM drogonframework/drogon:latest
WORKDIR /app
RUN apt-get update && apt-get install -y libpq-dev && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/build/blog_backend ./build/blog_backend
COPY config.json .
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh
RUN mkdir -p images
VOLUME ["/app/images"]
EXPOSE 8080
ENTRYPOINT ["/app/entrypoint.sh"]
