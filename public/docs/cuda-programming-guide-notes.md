> 配套书目：《CUDA C 编程权威指南》（程润伟 等著）
> 适用人群：有 C/C++ 基础，希望系统掌握 CUDA 的开发者
> 编译命令通用：`nvcc -arch=sm_75 xxx.cu -o xxx`（`sm_xx` 根据自己的 GPU 计算能力调整）

---

## 目录

- [第 1 章 基于 CUDA 的异构并行计算](#第-1-章-基于-cuda-的异构并行计算)
- [第 2 章 CUDA 编程模型](#第-2-章-cuda-编程模型)
- [第 3 章 CUDA 执行模型](#第-3-章-cuda-执行模型)
- [第 4 章 全局内存](#第-4-章-全局内存)
- [第 5 章 共享内存和常量内存](#第-5-章-共享内存和常量内存)
- [第 6 章 流和并发](#第-6-章-流和并发)
- [第 7 章 调整指令级原语](#第-7-章-调整指令级原语)
- [第 8 章 GPU 加速库和 OpenACC](#第-8-章-gpu-加速库和-openacc)
- [第 9 章 多 GPU 编程](#第-9-章-多-gpu-编程)
- [第 10 章 程序实现的注意事项](#第-10-章-程序实现的注意事项)
- [附录 A 通用错误检查宏](#附录-a-通用错误检查宏)

---

## 第 1 章 基于 CUDA 的异构并行计算

### 1.1 关键概念

| 概念 | 要点 |
|------|------|
| **并行类型** | 任务并行（多个独立函数并行）、数据并行（同一指令处理大量数据，CUDA 的主战场） |
| **数据划分** | 块划分（连续数据交一个线程） vs 周期划分（线程交错处理多块） |
| **Flynn 分类** | SISD（传统 CPU 单核）、SIMD（向量化）、MISD（罕见）、MIMD（多核 CPU） |
| **GPU 架构** | NVIDIA 称之为 **SIMT**（单指令多线程），是 SIMD 的扩展 |
| **CPU vs GPU** | CPU 核心"重"（深流水线、大缓存、强分支预测，优化串行延迟）；GPU 核心"轻"（数千并发线程，优化吞吐量） |
| **异构计算** | CPU 跑控制密集 / 串行任务，GPU 跑数据密集 / 并行任务，二者互补 |

CUDA 程序的 5 个基本步骤（贯穿全书）：

1. 分配 GPU 内存
2. 主机 → 设备 拷贝数据
3. 调用核函数计算
4. 设备 → 主机 拷贝结果
5. 释放 GPU 内存

### 1.2 第一个 CUDA 程序：Hello World

```cpp
// hello.cu
#include <stdio.h>

__global__ void helloFromGPU(void) {
    printf("Hello World from GPU thread %d!\n", threadIdx.x);
}

int main(void) {
    printf("Hello World from CPU!\n");

    // <<<grid_dim, block_dim>>>:1 个 block,10 个线程
    helloFromGPU<<<1, 10>>>();

    // 显式同步:等待 GPU 上的 printf 输出全部完成
    cudaDeviceReset();
    return 0;
}
```

编译运行：
```bash
nvcc -arch=sm_60 hello.cu -o hello && ./hello
```

要点：
- `__global__` 修饰符表示该函数在 GPU 上执行、由 CPU 调用
- `<<<...>>>` 称为 **执行配置**：第一个参数是网格中线程块数，第二个是每块的线程数
- 核函数调用对主机是 **异步** 的，必须 `cudaDeviceSynchronize()` 或 `cudaDeviceReset()` 才能看到 printf 输出

### 1.3 检查环境

```bash
which nvcc            # 看 CUDA 编译器装没装
nvidia-smi            # 看显卡和驱动
nvcc --version        # 看 CUDA 工具包版本
```

---

## 第 2 章 CUDA 编程模型

### 2.1 编程结构与内存管理

CUDA 把内存分成 **主机内存**（host）和 **设备内存**（device）。最常用的几个 API：

| 函数 | 说明 |
|------|------|
| `cudaMalloc(void** dev_ptr, size_t size)` | 在设备上分配内存 |
| `cudaMemcpy(dst, src, size, kind)` | 主机/设备之间拷贝；`kind` 是 `cudaMemcpyHostToDevice` 等 |
| `cudaMemset(dev_ptr, value, size)` | 设备内存初始化 |
| `cudaFree(dev_ptr)` | 释放设备内存 |

### 2.2 线程层次：Grid → Block → Thread

CUDA 用 **二级线程层次结构** 组织线程：
- **Grid**（网格）：核函数启动时创建的所有线程的集合
- **Block**（线程块）：网格中的一组线程，**同一块内的线程可共享内存、可同步**，不同块间不能直接通信

每个线程内置变量：
- `gridDim.{x,y,z}`：网格维度（块数）
- `blockDim.{x,y,z}`：块维度（线程数）
- `blockIdx.{x,y,z}`：当前线程所属块的索引
- `threadIdx.{x,y,z}`：当前线程在块内的索引

一维全局索引的标准写法：
```cpp
int idx = blockIdx.x * blockDim.x + threadIdx.x;
```

### 2.3 完整示例：向量加法

```cpp
// vectorAdd.cu - 经典入门示例
#include <stdio.h>
#include <stdlib.h>
#include <cuda_runtime.h>

#define CHECK(call)                                                            \
{                                                                              \
    const cudaError_t error = call;                                            \
    if (error != cudaSuccess) {                                                \
        fprintf(stderr, "Error: %s:%d, ", __FILE__, __LINE__);                 \
        fprintf(stderr, "code:%d, reason: %s\n", error,                        \
                cudaGetErrorString(error));                                    \
        exit(1);                                                               \
    }                                                                          \
}

// 核函数:每个线程计算一个元素
__global__ void sumArraysOnGPU(float *A, float *B, float *C, const int N) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < N) C[i] = A[i] + B[i];   // 必须做边界检查
}

int main(int argc, char **argv) {
    int N = 1 << 24;                 // 16M 元素
    size_t nBytes = N * sizeof(float);

    // 1. 分配主机内存
    float *h_A = (float *)malloc(nBytes);
    float *h_B = (float *)malloc(nBytes);
    float *h_C = (float *)malloc(nBytes);
    for (int i = 0; i < N; i++) { h_A[i] = i * 0.1f; h_B[i] = i * 0.2f; }

    // 2. 分配设备内存
    float *d_A, *d_B, *d_C;
    CHECK(cudaMalloc((void **)&d_A, nBytes));
    CHECK(cudaMalloc((void **)&d_B, nBytes));
    CHECK(cudaMalloc((void **)&d_C, nBytes));

    // 3. 主机 -> 设备
    CHECK(cudaMemcpy(d_A, h_A, nBytes, cudaMemcpyHostToDevice));
    CHECK(cudaMemcpy(d_B, h_B, nBytes, cudaMemcpyHostToDevice));

    // 4. 启动核函数
    int blockSize = 256;
    int gridSize  = (N + blockSize - 1) / blockSize;     // 向上取整
    sumArraysOnGPU<<<gridSize, blockSize>>>(d_A, d_B, d_C, N);
    CHECK(cudaGetLastError());                            // 检查启动错误
    CHECK(cudaDeviceSynchronize());                       // 等待执行完毕

    // 5. 设备 -> 主机
    CHECK(cudaMemcpy(h_C, d_C, nBytes, cudaMemcpyDeviceToHost));

    // 6. 清理
    cudaFree(d_A); cudaFree(d_B); cudaFree(d_C);
    free(h_A); free(h_B); free(h_C);
    cudaDeviceReset();
    return 0;
}
```

### 2.4 给核函数计时

#### 2.4.1 CPU 计时器

```cpp
#include <sys/time.h>

double cpuSecond() {
    struct timeval tp;
    gettimeofday(&tp, NULL);
    return (double)tp.tv_sec + (double)tp.tv_usec * 1.e-6;
}

// 用法
double t0 = cpuSecond();
sumArraysOnGPU<<<grid, block>>>(d_A, d_B, d_C, N);
cudaDeviceSynchronize();             // 关键!核函数是异步的
double elapsed = cpuSecond() - t0;
printf("Kernel elapsed: %f sec\n", elapsed);
```

#### 2.4.2 nvprof / nsys

```bash
nvprof ./vectorAdd                   # 老工具,Pascal 之前
nsys profile -o report ./vectorAdd   # 新工具,Volta 及之后建议用
ncu ./vectorAdd                      # Nsight Compute,内核级分析
```

输出包含：内核执行时间、内存拷贝时间、API 调用时间。**经常会发现内存拷贝时间比内核计算还长——这就是为什么后面要重点研究固定内存、零拷贝、统一内存、流并发。**

### 2.5 二维布局：矩阵加法

```cpp
// matrixAdd.cu - 二维网格 + 二维块
__global__ void sumMatrixOnGPU2D(float *A, float *B, float *C, int nx, int ny) {
    unsigned int ix = blockIdx.x * blockDim.x + threadIdx.x;
    unsigned int iy = blockIdx.y * blockDim.y + threadIdx.y;
    unsigned int idx = iy * nx + ix;       // 行优先线性化

    if (ix < nx && iy < ny) C[idx] = A[idx] + B[idx];
}

int main() {
    int nx = 1 << 14, ny = 1 << 14;        // 16384 x 16384
    int nxy = nx * ny;
    size_t nBytes = nxy * sizeof(float);

    float *d_A, *d_B, *d_C;
    cudaMalloc(&d_A, nBytes); cudaMalloc(&d_B, nBytes); cudaMalloc(&d_C, nBytes);
    // ... (省略数据初始化和拷贝)

    dim3 block(32, 32);                    // 每块 1024 线程(常见上限)
    dim3 grid((nx + block.x - 1) / block.x,
              (ny + block.y - 1) / block.y);

    sumMatrixOnGPU2D<<<grid, block>>>(d_A, d_B, d_C, nx, ny);
    cudaDeviceSynchronize();
    // ...
}
```

> **经验**：块大小通常选 128/256/512，且必须是 32 的倍数（线程束大小）。块大小不同会显著影响性能，需配合具体 GPU 调优。

### 2.6 设备管理：查询 GPU 信息

```cpp
// deviceQuery.cu
#include <cuda_runtime.h>
#include <stdio.h>

int main() {
    int deviceCount = 0;
    cudaGetDeviceCount(&deviceCount);
    printf("Found %d CUDA device(s)\n", deviceCount);

    for (int dev = 0; dev < deviceCount; dev++) {
        cudaDeviceProp prop;
        cudaGetDeviceProperties(&prop, dev);
        printf("\nDevice %d: %s\n", dev, prop.name);
        printf("  Compute capability:        %d.%d\n", prop.major, prop.minor);
        printf("  Total global memory:       %.2f GB\n",
               prop.totalGlobalMem / (1024.0 * 1024 * 1024));
        printf("  SM count:                  %d\n", prop.multiProcessorCount);
        printf("  Max threads per block:     %d\n", prop.maxThreadsPerBlock);
        printf("  Max threads per SM:        %d\n", prop.maxThreadsPerMultiProcessor);
        printf("  Warp size:                 %d\n", prop.warpSize);
        printf("  Shared mem per block:      %zu KB\n", prop.sharedMemPerBlock / 1024);
        printf("  Registers per block:       %d\n", prop.regsPerBlock);
        printf("  Memory clock rate:         %.0f MHz\n", prop.memoryClockRate / 1000.0);
        printf("  Memory bus width:          %d-bit\n", prop.memoryBusWidth);
    }
    return 0;
}
```

选择最优 GPU（多卡环境）：
```cpp
int numDevices = 0;
cudaGetDeviceCount(&numDevices);
if (numDevices > 1) {
    int maxMP = 0, maxDev = 0;
    for (int d = 0; d < numDevices; d++) {
        cudaDeviceProp prop;
        cudaGetDeviceProperties(&prop, d);
        if (prop.multiProcessorCount > maxMP) {
            maxMP = prop.multiProcessorCount;
            maxDev = d;
        }
    }
    cudaSetDevice(maxDev);
}
```

---

## 第 3 章 CUDA 执行模型

这一章从硬件角度解释 GPU 是怎么调度成千上万线程的，是 CUDA 性能调优的根基。

### 3.1 GPU 架构

GPU 的核心是 **SM（Streaming Multiprocessor，流式多处理器）**。每个 SM 含有：
- 多个 CUDA 核心（执行整数 / 浮点运算）
- 寄存器文件（数万到十几万个 32-bit 寄存器）
- 共享内存 / L1 缓存
- 线程束调度器（warp scheduler）
- 特殊功能单元（SFU，处理 `sin`、`cos` 等）

| 架构 | 代表 GPU | CC | 特点 |
|------|---------|-----|------|
| Fermi | Tesla M2090 | 2.x | 首次引入完整 L1/L2 缓存 |
| Kepler | K20/K40 | 3.x | Hyper-Q、动态并行 |
| Maxwell | GTX 980 | 5.x | 能耗比大幅提升 |
| Pascal | P100 | 6.x | 统一内存改进、NVLink |
| Volta | V100 | 7.0 | Tensor Core、独立线程调度 |
| Turing | RTX 20xx | 7.5 | RT Core |
| Ampere | A100/RTX 30xx | 8.x | 第三代 Tensor Core |
| Hopper | H100 | 9.x | Transformer Engine |

### 3.2 线程束（Warp）：CUDA 调度的基本单位

- 一个 warp = **32 个线程**
- 同一 warp 内的线程**同时执行同一条指令**（SIMT）
- 一个线程块被划分成若干 warp（由 `blockDim` 决定）

```
块大小 128 线程 = 4 个 warp
块大小 100 线程 = 4 个 warp（最后一个只有 4 个活跃线程,造成浪费）
```

> **第一条优化原则：块大小一定要是 32 的倍数。**

### 3.3 线程束分化（Warp Divergence）

当 warp 内线程走不同分支时，硬件**串行执行所有分支路径**，性能急剧下降。

```cpp
// 坏例子:同一 warp 内一半走 if,一半走 else,两条路径都执行
__global__ void mathKernel1(float *c) {
    int tid = blockIdx.x * blockDim.x + threadIdx.x;
    float a = 0.0, b = 0.0;
    if (tid % 2 == 0) a = 100.0f;        // 偶数线程
    else              b = 200.0f;        // 奇数线程
    c[tid] = a + b;
}

// 好例子:让分支按 warp 对齐(每 32 个线程走同一分支)
__global__ void mathKernel2(float *c) {
    int tid = blockIdx.x * blockDim.x + threadIdx.x;
    float a = 0.0, b = 0.0;
    if ((tid / warpSize) % 2 == 0) a = 100.0f;   // warp 整体走 if
    else                           b = 200.0f;   // warp 整体走 else
    c[tid] = a + b;
}
```

用 `nvprof --metrics branch_efficiency` 可量化分化程度。

### 3.4 资源分配与占用率（Occupancy）

每个 SM 有固定资源：寄存器、共享内存、最大线程数、最大块数。一个核函数能在 SM 上同时驻留多少个 warp，称为 **占用率**（active warps / max warps）。

占用率越高，越容易**用并行隐藏延迟**（一个 warp 等内存时切到另一 warp 计算）。

提升占用率的几个方向：
- 控制每个线程使用的寄存器数：编译时加 `-Xptxas -v` 可以打印用了多少寄存器
- 用 `__launch_bounds__(maxThreadsPerBlock, minBlocksPerSM)` 给编译器提示
- 控制每个块的共享内存使用量
- 选择合适的块大小（不要太大，否则寄存器/共享内存不够导致驻留块数下降）

```cpp
__global__ void __launch_bounds__(256, 4)   // 块最大 256 线程,每 SM 至少 4 块
myKernel(float *data) { /* ... */ }
```

### 3.5 同步

- **`__syncthreads()`**：块内同步，所有线程到达此处才继续。**只能用于一个块内，不能同步全局**
- **`__threadfence()`**：内存栅栏，保证写操作对其他线程可见
- 全局同步只能通过**结束核函数**实现（核函数返回时所有线程都已结束）

### 3.6 并行归约：从分化到展开的优化案例

并行归约就是把一个数组的所有元素累加（或求最大、最小）成一个值。这是教科书级的 CUDA 优化案例。

#### 版本 1：邻近配对（有严重分化）

```cpp
__global__ void reduceNeighbored(int *g_idata, int *g_odata, unsigned int n) {
    unsigned int tid = threadIdx.x;
    int *idata = g_idata + blockIdx.x * blockDim.x;
    if (blockIdx.x * blockDim.x + tid >= n) return;

    // 每轮:只让 tid 是 stride 倍数的线程工作 -> warp 内一半空闲,严重分化
    for (int stride = 1; stride < blockDim.x; stride *= 2) {
        if ((tid % (2 * stride)) == 0) {
            idata[tid] += idata[tid + stride];
        }
        __syncthreads();
    }
    if (tid == 0) g_odata[blockIdx.x] = idata[0];
}
```

#### 版本 2：邻近配对（消除分化）

```cpp
__global__ void reduceNeighboredLess(int *g_idata, int *g_odata, unsigned int n) {
    unsigned int tid = threadIdx.x;
    int *idata = g_idata + blockIdx.x * blockDim.x;

    for (int stride = 1; stride < blockDim.x; stride *= 2) {
        // 把"哪些线程工作"改成连续 ID,前面 N/2 个线程整 warp 工作
        int index = 2 * stride * tid;
        if (index < blockDim.x) {
            idata[index] += idata[index + stride];
        }
        __syncthreads();
    }
    if (tid == 0) g_odata[blockIdx.x] = idata[0];
}
```

#### 版本 3：交错配对（性能最好的基础版）

```cpp
__global__ void reduceInterleaved(int *g_idata, int *g_odata, unsigned int n) {
    unsigned int tid = threadIdx.x;
    int *idata = g_idata + blockIdx.x * blockDim.x;

    // stride 从大到小,前一半线程一直在工作,内存访问也更连续
    for (int stride = blockDim.x / 2; stride > 0; stride >>= 1) {
        if (tid < stride) {
            idata[tid] += idata[tid + stride];
        }
        __syncthreads();
    }
    if (tid == 0) g_odata[blockIdx.x] = idata[0];
}
```

#### 版本 4：循环展开 + 线程展开

```cpp
__global__ void reduceUnrolling8(int *g_idata, int *g_odata, unsigned int n) {
    unsigned int tid = threadIdx.x;
    unsigned int idx = blockIdx.x * blockDim.x * 8 + tid;
    int *idata = g_idata + blockIdx.x * blockDim.x * 8;

    // 一次性把 8 个块的数据加到一个块里 -> 数据吞吐量 x8
    if (idx + 7 * blockDim.x < n) {
        int a1 = g_idata[idx];
        int a2 = g_idata[idx + blockDim.x];
        int a3 = g_idata[idx + 2 * blockDim.x];
        int a4 = g_idata[idx + 3 * blockDim.x];
        int a5 = g_idata[idx + 4 * blockDim.x];
        int a6 = g_idata[idx + 5 * blockDim.x];
        int a7 = g_idata[idx + 6 * blockDim.x];
        int a8 = g_idata[idx + 7 * blockDim.x];
        g_idata[idx] = a1 + a2 + a3 + a4 + a5 + a6 + a7 + a8;
    }
    __syncthreads();

    // 标准交错归约
    for (int stride = blockDim.x / 2; stride > 32; stride >>= 1) {
        if (tid < stride) idata[tid] += idata[tid + stride];
        __syncthreads();
    }

    // 最后一个 warp 内不再需要 __syncthreads,直接展开
    if (tid < 32) {
        volatile int *vmem = idata;       // volatile 防编译器优化导致正确性问题
        vmem[tid] += vmem[tid + 32];
        vmem[tid] += vmem[tid + 16];
        vmem[tid] += vmem[tid + 8];
        vmem[tid] += vmem[tid + 4];
        vmem[tid] += vmem[tid + 2];
        vmem[tid] += vmem[tid + 1];
    }
    if (tid == 0) g_odata[blockIdx.x] = idata[0];
}
```

调用：注意网格大小要除以 8。
```cpp
reduceUnrolling8<<<grid.x / 8, block>>>(d_idata, d_odata, size);
```

性能对比（参考书中数据，K20 GPU，16M 元素）：

| 内核 | 时间 (ms) | 加速比 |
|------|-----------|--------|
| reduceNeighbored | 1.43 | 1.0x |
| reduceNeighboredLess | 0.95 | 1.5x |
| reduceInterleaved | 0.78 | 1.8x |
| reduceUnrolling8 | 0.18 | 7.9x |

### 3.7 动态并行（Dynamic Parallelism）

CC 3.5+ 支持核函数内部再启动核函数。要点：
- 编译时加 `-rdc=true` 和 `-lcudadevrt`
- 子网格能看到父网格的全局内存
- 嵌套层数有限（一般 24 层）

```cpp
// nestedHelloWorld.cu
__global__ void nestedHelloWorld(int iSize, int iDepth) {
    int tid = threadIdx.x;
    printf("Recursion=%d: Hello World from thread %d, block %d\n",
           iDepth, tid, blockIdx.x);

    if (iSize == 1) return;

    // 只让 0 号线程启动子网格
    int nthreads = iSize >> 1;
    if (tid == 0 && nthreads > 0) {
        nestedHelloWorld<<<1, nthreads>>>(nthreads, ++iDepth);
        printf("------> nested execution depth: %d\n", iDepth);
    }
}

int main() {
    nestedHelloWorld<<<1, 8>>>(8, 0);
    cudaDeviceSynchronize();
    cudaDeviceReset();
    return 0;
}
```

编译：
```bash
nvcc -arch=sm_60 -rdc=true nestedHelloWorld.cu -o nested -lcudadevrt
```

> **慎用动态并行**：每次嵌套都有显著启动开销，只在递归算法（树遍历、自适应网格）中收益明显。


---

## 第 4 章 全局内存

全局内存是 GPU 上容量最大、延迟最高的内存。**对全局内存的访问效率往往是 CUDA 程序性能的瓶颈**。

### 4.1 CUDA 内存模型

| 内存类型 | 位置 | 缓存 | 范围 | 生命周期 | 访问 |
|---------|------|------|------|---------|------|
| 寄存器 (Register) | 片上 | N/A | 单线程 | 线程 | 最快 |
| 本地内存 (Local) | 片外 (DRAM) | L1/L2 | 单线程 | 线程 | 慢（实为全局内存的一部分） |
| 共享内存 (Shared) | 片上 (SM) | N/A | 块 | 块 | 快（与 L1 共用硬件） |
| 全局内存 (Global) | 片外 (DRAM) | L1/L2 | 全部 | 应用 | 最慢但最大 |
| 常量内存 (Constant) | 片外 + 缓存 | 专用 | 全部（只读） | 应用 | 缓存命中时极快 |
| 纹理内存 (Texture) | 片外 + 缓存 | 专用 | 全部（只读） | 应用 | 适合 2D 局部访问 |

### 4.2 内存管理 API

#### 4.2.1 标准分配

```cpp
float *d_ptr;
cudaMalloc(&d_ptr, N * sizeof(float));   // 设备内存
cudaMemcpy(d_ptr, h_ptr, N * sizeof(float), cudaMemcpyHostToDevice);
cudaFree(d_ptr);
```

#### 4.2.2 固定内存（Pinned / Page-Locked）

普通的 `malloc` 返回的是可分页内存（pageable），CUDA 拷贝时需要先复制到 driver 的临时 pinned 缓冲区。**直接用 pinned memory 可以省掉这一步，提升 H2D/D2H 带宽 2-3 倍**。

```cpp
float *h_pinned;
cudaMallocHost(&h_pinned, N * sizeof(float));   // 或 cudaHostAlloc
// ... 使用 h_pinned 跟普通指针一样
cudaFreeHost(h_pinned);
```

> 代价：固定内存不能被换出到磁盘，分配过多会拖慢系统。

#### 4.2.3 零拷贝内存（Zero-Copy）

主机内存被映射到设备地址空间，设备核函数直接访问主机内存（通过 PCIe）。

```cpp
float *h_a, *d_a;
cudaHostAlloc(&h_a, N * sizeof(float), cudaHostAllocMapped);
cudaHostGetDevicePointer(&d_a, h_a, 0);   // d_a 是设备能访问的地址
// 核函数中可直接读写 d_a,但每次访问都走 PCIe,只适合数据量小、访问次数少的场景
```

#### 4.2.4 统一内存（Unified Memory，CC 6.0+ 推荐）

一份指针主机和设备都能用，运行时自动迁移页。

```cpp
float *uniA;
cudaMallocManaged(&uniA, N * sizeof(float));
// 主机直接初始化
for (int i = 0; i < N; i++) uniA[i] = i;
// 设备直接使用
myKernel<<<grid, block>>>(uniA, N);
cudaDeviceSynchronize();           // 等待 GPU 完成
// 主机直接读结果
printf("%f\n", uniA[0]);
cudaFree(uniA);
```

可以用 `cudaMemPrefetchAsync` 主动迁移：
```cpp
cudaMemPrefetchAsync(uniA, N * sizeof(float), deviceId);  // 提前到 GPU
```

### 4.3 全局内存访问模式：对齐与合并

**这是 CUDA 全局内存优化最核心的概念。**

GPU 访问全局内存的最小单位是 **32 字节、64 字节或 128 字节的事务**（取决于缓存行）。当一个 warp（32 个线程）发起内存请求时：

- **合并访问（Coalesced）**：32 个线程访问的地址恰好落在一个或少数几个事务里 → 一次或少数几次内存事务搞定，效率最高
- **未合并访问**：散乱访问 → 多次事务，带宽利用率断崖式下跌

#### 4.3.1 好例子：行优先连续访问

```cpp
// 每个线程访问连续地址 -> 一个 warp 的访问聚成一两个事务
__global__ void copyRow(float *out, float *in, int nx, int ny) {
    int ix = blockIdx.x * blockDim.x + threadIdx.x;
    int iy = blockIdx.y * blockDim.y + threadIdx.y;
    int idx = iy * nx + ix;
    if (ix < nx && iy < ny) out[idx] = in[idx];
}
```

#### 4.3.2 坏例子：列优先访问（跨步）

```cpp
// 同一 warp 中相邻线程访问跨距 nx 的地址 -> 32 次独立事务
__global__ void copyCol(float *out, float *in, int nx, int ny) {
    int ix = blockIdx.x * blockDim.x + threadIdx.x;
    int iy = blockIdx.y * blockDim.y + threadIdx.y;
    int idx = ix * ny + iy;          // 注意:索引顺序变了
    if (ix < nx && iy < ny) out[idx] = in[idx];
}
```

#### 4.3.3 经典实验：矩阵转置

矩阵转置的核心矛盾：要么读连续写跨步，要么读跨步写连续。

```cpp
// 朴素版本:读合并,写不合并
__global__ void transposeNaive(float *out, float *in, int nx, int ny) {
    int ix = blockIdx.x * blockDim.x + threadIdx.x;
    int iy = blockIdx.y * blockDim.y + threadIdx.y;
    if (ix < nx && iy < ny) {
        out[ix * ny + iy] = in[iy * nx + ix];
    }
}
```

通过共享内存可以双向合并访问（见第 5 章）。

### 4.4 AoS vs SoA：数据布局

```cpp
// AoS (Array of Structures) - 每个线程访问的字段在内存上分散
struct Point { float x, y, z; };
Point points[N];
// 线程 0 读 points[0].x, 线程 1 读 points[1].x...
// 实际地址: 0, 12, 24, 36... -> 跨步访问

// SoA (Structure of Arrays) - 同一字段连续存储,完美合并
struct Points {
    float x[N];
    float y[N];
    float z[N];
};
// 线程 0 读 x[0], 线程 1 读 x[1]... -> 连续访问
```

**结论**：CUDA 中能用 SoA 就用 SoA，性能可差 2-3 倍。

### 4.5 综合示例：使用统一内存的矩阵加法

```cpp
#include <stdio.h>
#include <cuda_runtime.h>

__global__ void sumMatrixGPU(float *A, float *B, float *C, int nx, int ny) {
    unsigned int ix = blockIdx.x * blockDim.x + threadIdx.x;
    unsigned int iy = blockIdx.y * blockDim.y + threadIdx.y;
    unsigned int idx = iy * nx + ix;
    if (ix < nx && iy < ny) C[idx] = A[idx] + B[idx];
}

int main() {
    int nx = 1 << 13, ny = 1 << 13;
    int nxy = nx * ny;
    size_t nBytes = nxy * sizeof(float);

    // 统一内存:一次分配,主机设备共用
    float *A, *B, *C;
    cudaMallocManaged(&A, nBytes);
    cudaMallocManaged(&B, nBytes);
    cudaMallocManaged(&C, nBytes);

    for (int i = 0; i < nxy; i++) { A[i] = 1.0f; B[i] = 2.0f; }

    dim3 block(32, 32);
    dim3 grid((nx + block.x - 1) / block.x, (ny + block.y - 1) / block.y);

    // 提示运行时把数据预迁移到 GPU
    int dev = 0;
    cudaMemPrefetchAsync(A, nBytes, dev);
    cudaMemPrefetchAsync(B, nBytes, dev);

    sumMatrixGPU<<<grid, block>>>(A, B, C, nx, ny);
    cudaDeviceSynchronize();

    printf("C[0]=%f, C[last]=%f\n", C[0], C[nxy - 1]);
    cudaFree(A); cudaFree(B); cudaFree(C);
    return 0;
}
```

---

## 第 5 章 共享内存和常量内存

### 5.1 共享内存基础

共享内存（Shared Memory）位于 SM 内部，延迟约为全局内存的 1/100，是 CUDA 性能优化的"杀手锏"。

声明方式：
```cpp
// 1. 静态(编译期已知大小)
__shared__ float sdata[256];

// 2. 动态(启动时指定大小)
extern __shared__ float sdata[];
// 启动时:myKernel<<<grid, block, sharedBytes>>>(...);
```

### 5.2 存储体（Bank）和存储体冲突

共享内存被划分成 **32 个存储体**（bank），每个 bank 在每个时钟周期能服务一次访问。
- 一个 warp 的 32 个线程**访问 32 个不同 bank** → 一次完成（理想）
- 多个线程访问**同一 bank 的不同地址** → 串行化（bank conflict）
- 多个线程访问**同一 bank 的同一地址** → 广播（无冲突）

地址到 bank 的映射（4 字节模式）：
```
bank_index = (byte_address / 4) % 32
```

#### 例：32×32 共享数组的列访问会冲突

```cpp
__shared__ float tile[32][32];
// 线程束读列 -> 每个线程访问 tile[i][col],i=0..31
// 这些地址都在 bank=col,32 路冲突
float v = tile[threadIdx.x][threadIdx.y];   // 注意是 [tid.x][tid.y]
```

**解决方案：内存填充（Padding）**

```cpp
__shared__ float tile[32][33];     // 故意多一列
// 现在 tile[i][col] 的 bank = (i*33 + col) % 32,每行 bank 序列错开
```

### 5.3 共享内存优化：矩阵转置

```cpp
#define BDIMX 32
#define BDIMY 32

__global__ void transposeSmemPad(float *out, float *in, int nx, int ny) {
    __shared__ float tile[BDIMY][BDIMX + 1];   // +1 消除 bank 冲突

    // 1. 把一个 BDIMY x BDIMX 的瓦片合并地从 in 读进共享内存
    unsigned int ix = blockIdx.x * BDIMX + threadIdx.x;
    unsigned int iy = blockIdx.y * BDIMY + threadIdx.y;
    if (ix < nx && iy < ny) {
        tile[threadIdx.y][threadIdx.x] = in[iy * nx + ix];
    }
    __syncthreads();

    // 2. 转置后的瓦片合并地写回 out
    //    注意线程到目标块坐标的重新映射
    unsigned int t_ix = blockIdx.y * BDIMY + threadIdx.x;
    unsigned int t_iy = blockIdx.x * BDIMX + threadIdx.y;
    if (t_ix < ny && t_iy < nx) {
        out[t_iy * ny + t_ix] = tile[threadIdx.x][threadIdx.y];
    }
}
```

性能对比（参考量级）：
- transposeNaive：~25 GB/s
- transposeSmem（带冲突）：~80 GB/s
- transposeSmemPad：~120 GB/s（接近理论峰值）

### 5.4 使用共享内存的并行归约

第 3 章用全局内存做归约，会反复读写全局内存。改用共享内存：

```cpp
__global__ void reduceSmem(int *g_idata, int *g_odata, unsigned int n) {
    __shared__ int smem[256];      // 假设 blockDim.x = 256
    unsigned int tid = threadIdx.x;
    unsigned int idx = blockIdx.x * blockDim.x + tid;

    // 1. 把数据加载到共享内存
    smem[tid] = (idx < n) ? g_idata[idx] : 0;
    __syncthreads();

    // 2. 在共享内存上归约
    for (int stride = blockDim.x / 2; stride > 0; stride >>= 1) {
        if (tid < stride) smem[tid] += smem[tid + stride];
        __syncthreads();
    }

    // 3. 块结果写回全局内存
    if (tid == 0) g_odata[blockIdx.x] = smem[0];
}
```

### 5.5 常量内存

常量内存（Constant Memory）是只读的，专为同一 warp 内所有线程读取**同一地址**优化（一次读取广播到全 warp）。

```cpp
__constant__ float coef[5];        // 文件作用域

// 主机端拷贝
float h_coef[5] = {0.1f, 0.2f, 0.4f, 0.2f, 0.1f};
cudaMemcpyToSymbol(coef, h_coef, 5 * sizeof(float));

__global__ void stencil1D(float *in, float *out, int n) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= 2 && idx < n - 2) {
        out[idx] = coef[0] * in[idx - 2]
                 + coef[1] * in[idx - 1]
                 + coef[2] * in[idx]
                 + coef[3] * in[idx + 1]
                 + coef[4] * in[idx + 2];
    }
}
```

### 5.6 只读缓存（Read-Only Cache）

CC 3.5+ 提供只读缓存（也叫纹理缓存）。两种使用方式：
```cpp
// 方式 1:用 __ldg 内置函数
__global__ void kernel(const float * __restrict__ in, float *out) {
    int idx = ...;
    out[idx] = __ldg(&in[idx]);    // 走只读缓存
}

// 方式 2:把指针标记为 const __restrict__
__global__ void kernel2(const float * __restrict__ in, float *out) {
    int idx = ...;
    out[idx] = in[idx];            // 编译器自动走只读缓存
}
```

### 5.7 线程束洗牌指令（Warp Shuffle）

CC 3.0+ 引入，**warp 内的线程可以直接交换寄存器，不需要共享内存中转**。

| 函数 | 作用 |
|------|------|
| `__shfl_sync(mask, var, srcLane)` | 从 srcLane 复制 var 给所有线程 |
| `__shfl_up_sync(mask, var, delta)` | 从 lane-delta 复制 |
| `__shfl_down_sync(mask, var, delta)` | 从 lane+delta 复制 |
| `__shfl_xor_sync(mask, var, mask)` | 与 lane^mask 交换 |

> 注：CUDA 9.0 起带 `_sync` 后缀，第一个参数是参与的线程掩码（一般用 `0xFFFFFFFF` 表示全 warp）。

#### 用 shuffle 实现 warp 内归约

```cpp
__inline__ __device__ int warpReduceSum(int val) {
    for (int offset = 16; offset > 0; offset >>= 1) {
        val += __shfl_down_sync(0xFFFFFFFF, val, offset);
    }
    return val;        // lane 0 持有最终的 warp 归约结果
}

__global__ void reduceShfl(int *g_idata, int *g_odata, unsigned int n) {
    int tid = threadIdx.x;
    int idx = blockIdx.x * blockDim.x + tid;
    int val = (idx < n) ? g_idata[idx] : 0;

    // 块内多个 warp 归约
    val = warpReduceSum(val);

    // 用共享内存把每 warp 的结果汇总
    __shared__ int sums[32];
    int lane = tid % 32;
    int wid  = tid / 32;
    if (lane == 0) sums[wid] = val;
    __syncthreads();

    // 第一个 warp 再做一次归约
    val = (tid < blockDim.x / 32) ? sums[lane] : 0;
    if (wid == 0) val = warpReduceSum(val);

    if (tid == 0) g_odata[blockIdx.x] = val;
}
```

---

## 第 6 章 流和并发

CUDA 流（Stream）是**操作的执行队列**。同一流中的操作按顺序执行，不同流中的操作可以并发。这是 CUDA 实现 **计算与数据传输重叠**、**多核函数并发** 的关键。

### 6.1 创建和销毁流

```cpp
cudaStream_t stream;
cudaStreamCreate(&stream);

myKernel<<<grid, block, 0, stream>>>(...);   // 第 4 个参数指定流
cudaMemcpyAsync(d, h, size, cudaMemcpyHostToDevice, stream);

cudaStreamSynchronize(stream);    // 等待该流的所有操作完成
cudaStreamDestroy(stream);
```

注意：
- 异步拷贝 `cudaMemcpyAsync` **必须** 配合**固定内存**才能真正异步
- 默认流（流 0、空流）会阻塞所有阻塞流；用 `cudaStreamCreateWithFlags(&s, cudaStreamNonBlocking)` 创建的流不被默认流阻塞

### 6.2 CUDA 事件

事件是流中的标记，可用于：
- 同步：等待事件完成才执行后续操作
- 计时：精确测量两个事件之间的 GPU 时间

```cpp
cudaEvent_t start, stop;
cudaEventCreate(&start); cudaEventCreate(&stop);

cudaEventRecord(start, 0);                    // 在默认流中记录开始
myKernel<<<grid, block>>>(...);
cudaEventRecord(stop, 0);                     // 记录结束
cudaEventSynchronize(stop);                   // 等待 stop 事件完成

float ms;
cudaEventElapsedTime(&ms, start, stop);
printf("Kernel time: %.3f ms\n", ms);

cudaEventDestroy(start); cudaEventDestroy(stop);
```

### 6.3 并发内核执行

```cpp
#define NSTREAMS 4

cudaStream_t streams[NSTREAMS];
for (int i = 0; i < NSTREAMS; i++) cudaStreamCreate(&streams[i]);

// 启动 4 个互不相关的核函数到不同流 -> 可能并发执行
for (int i = 0; i < NSTREAMS; i++) {
    kernel_1<<<grid, block, 0, streams[i]>>>(d_data[i]);
    kernel_2<<<grid, block, 0, streams[i]>>>(d_data[i]);
}

for (int i = 0; i < NSTREAMS; i++) cudaStreamSynchronize(streams[i]);
```

实际能否并发取决于：硬件并发引擎数、SM 资源是否还够。

### 6.4 重叠数据传输和计算

这是流最重要的应用：把一份大数据切成多片，让一片在传输的同时另一片在计算。

```cpp
// 经典的"深度优先"调度模式
const int N = 1 << 22;
const int nStreams = 4;
const int streamSize = N / nStreams;
const size_t streamBytes = streamSize * sizeof(float);

float *h_A, *h_B;        // 必须用 pinned memory
cudaMallocHost(&h_A, N * sizeof(float));
cudaMallocHost(&h_B, N * sizeof(float));

float *d_A, *d_B;
cudaMalloc(&d_A, N * sizeof(float));
cudaMalloc(&d_B, N * sizeof(float));

cudaStream_t streams[nStreams];
for (int i = 0; i < nStreams; i++) cudaStreamCreate(&streams[i]);

// 把每一片的 H2D + Kernel + D2H 全发到同一个流里
// 不同片在不同流中,可以重叠
for (int i = 0; i < nStreams; i++) {
    int offset = i * streamSize;
    cudaMemcpyAsync(&d_A[offset], &h_A[offset], streamBytes,
                    cudaMemcpyHostToDevice, streams[i]);
    myKernel<<<gridSize, blockSize, 0, streams[i]>>>(&d_A[offset],
                                                     &d_B[offset],
                                                     streamSize);
    cudaMemcpyAsync(&h_B[offset], &d_B[offset], streamBytes,
                    cudaMemcpyDeviceToHost, streams[i]);
}

for (int i = 0; i < nStreams; i++) cudaStreamSynchronize(streams[i]);
```

执行示意：
```
默认串行:        |---H2D---|---Kernel---|---D2H---|
4 流并发:        |H2D 1|H2D 2|H2D 3|H2D 4|
                       |K 1|K 2|K 3|K 4|
                            |D2H 1|D2H 2|D2H 3|D2H 4|
```

理想情况下总时间能从 `T = T_h2d + T_kernel + T_d2h` 缩短到 `max(T_h2d, T_kernel, T_d2h)`。

### 6.5 流间依赖：cudaStreamWaitEvent

让一个流等另一个流的某个事件：
```cpp
cudaEvent_t e;
cudaEventCreate(&e);

producer<<<grid, block, 0, streamA>>>(...);
cudaEventRecord(e, streamA);

cudaStreamWaitEvent(streamB, e, 0);    // streamB 等 e 完成才执行
consumer<<<grid, block, 0, streamB>>>(...);
```

### 6.6 流回调

让 CPU 函数在 GPU 完成时自动被调用：
```cpp
void CUDART_CB myCallback(cudaStream_t stream, cudaError_t status, void *data) {
    printf("Stream done, data=%d\n", *(int*)data);
}

int userData = 42;
cudaStreamAddCallback(stream, myCallback, &userData, 0);
```

> 注：回调函数中**不能再调 CUDA API**。


---

## 第 7 章 调整指令级原语

本章关注最底层的优化手段：浮点精度、内部函数、原子操作。

### 7.1 浮点指令

CUDA 同时支持 32 位 `float` 和 64 位 `double`：
- 消费级 GPU 双精度算力通常只有单精度的 1/32
- 计算 / HPC 卡（V100、A100 等）双精度是单精度的 1/2

```cpp
__global__ void compareFloat(float *a, float *b, double *ad, double *bd) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    a[i] = b[i] * 2.0f + 1.0f;       // float
    ad[i] = bd[i] * 2.0 + 1.0;        // double - 注意字面量不要带 f
}
```

避免不经意的双精度：
```cpp
float x = 1.0f;
float y = x * 2.0;      // 2.0 是 double,会触发隐式提升,然后再转回 float
                        // 应写成 x * 2.0f
```

### 7.2 内部函数（Intrinsic）vs 标准函数

| 标准函数 | 内部函数 | 区别 |
|---------|---------|------|
| `sinf(x)` | `__sinf(x)` | 内部函数更快（用 SFU），精度低些 |
| `expf(x)` | `__expf(x)` | 同上 |
| `__fdividef(a, b)` | a / b | 显式快速除法 |
| `__fmaf_rn(a, b, c)` | a*b + c | 单指令 FMA（融合乘加） |

也可在编译时用 `-use_fast_math` 让所有标准函数自动用快速版本：
```bash
nvcc -use_fast_math -arch=sm_75 myapp.cu
```

### 7.3 原子操作

原子操作保证多线程对同一地址的读-改-写不会冲突。

| 函数 | 作用 |
|------|------|
| `atomicAdd(addr, val)` | `*addr += val` |
| `atomicSub`, `atomicMin`, `atomicMax` | 同名运算 |
| `atomicExch(addr, val)` | 原子交换 |
| `atomicCAS(addr, old, new)` | compare-and-swap，构建任意原子操作的基础 |

#### 例：用原子操作计数

```cpp
__global__ void countOdd(int *data, int *count, int n) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < n && (data[idx] & 1)) {
        atomicAdd(count, 1);
    }
}
```

#### 例：用 CAS 实现 atomicAdd for double（旧 GPU）

```cpp
__device__ double atomicAddDouble(double *addr, double val) {
    unsigned long long *addr_as_ull = (unsigned long long*)addr;
    unsigned long long old = *addr_as_ull, assumed;
    do {
        assumed = old;
        old = atomicCAS(addr_as_ull,
                        assumed,
                        __double_as_longlong(val + __longlong_as_double(assumed)));
    } while (assumed != old);
    return __longlong_as_double(old);
}
```

> CC 6.0+ 已原生支持 `atomicAdd(double*, double)`，新 GPU 上不需要这种 hack。

### 7.4 性能权衡

| 选择 | 何时用 |
|------|--------|
| `float` 而非 `double` | 单精度足够时（图形、神经网络推理） |
| `__sinf` 而非 `sinf` | 精度要求不高时 |
| `__fmul_rn`、`__fmaf_rn` | 需要严格 IEEE 舍入时 |
| 原子操作 | 写冲突不可避免时；优先用归约 / 共享内存 staging 来减少原子操作次数 |

---

## 第 8 章 GPU 加速库和 OpenACC

CUDA 生态有大量高度优化的库。**能用库就用库，不要重新造轮子。**

| 库 | 用途 |
|---|------|
| **cuBLAS** | 稠密线性代数（BLAS）：矩阵乘法、向量运算 |
| **cuSPARSE** | 稀疏矩阵运算 |
| **cuFFT** | 快速傅里叶变换 |
| **cuRAND** | 随机数生成（伪随机、拟随机） |
| **cuDNN** | 深度学习原语（卷积、池化、激活） |
| **Thrust** | C++ STL 风格的 GPU 算法库（reduce、sort、scan） |
| **NCCL** | 多 GPU 集合通信 |

### 8.1 通用工作流

所有 CUDA 库的使用模式都类似：

1. 创建库的 handle/context
2. 分配设备内存，把输入拷过去
3. 调用库函数
4. 把结果拷回主机
5. 销毁 handle

### 8.2 cuBLAS：矩阵乘法

```cpp
#include <cublas_v2.h>

int main() {
    int M = 1024, N = 1024, K = 1024;

    // 1. 创建 handle
    cublasHandle_t handle;
    cublasCreate(&handle);

    // 2. 设备内存
    float *d_A, *d_B, *d_C;
    cudaMalloc(&d_A, M * K * sizeof(float));
    cudaMalloc(&d_B, K * N * sizeof(float));
    cudaMalloc(&d_C, M * N * sizeof(float));
    // ... 填充 d_A, d_B

    // 3. 调用 GEMM: C = alpha*A*B + beta*C
    // 注意:cuBLAS 用列优先存储,接口顺序是 (B, A, C),不是 (A, B, C)
    float alpha = 1.0f, beta = 0.0f;
    cublasSgemm(handle, CUBLAS_OP_N, CUBLAS_OP_N,
                N, M, K,
                &alpha,
                d_B, N,
                d_A, K,
                &beta,
                d_C, N);

    cudaDeviceSynchronize();
    // ... 取结果

    cublasDestroy(handle);
    return 0;
}
```

编译：
```bash
nvcc -arch=sm_75 myapp.cu -o myapp -lcublas
```

### 8.3 cuFFT：快速傅里叶变换

```cpp
#include <cufft.h>

int N = 1 << 20;
cufftComplex *d_data;
cudaMalloc(&d_data, sizeof(cufftComplex) * N);
// ... 填充 d_data

cufftHandle plan;
cufftPlan1d(&plan, N, CUFFT_C2C, 1);                // 1D 复数到复数 FFT
cufftExecC2C(plan, d_data, d_data, CUFFT_FORWARD);  // 正变换(原地)
cudaDeviceSynchronize();
cufftDestroy(plan);
```

编译：`nvcc ... -lcufft`

### 8.4 cuRAND：随机数

#### 主机 API（一次生成大量随机数到设备数组）

```cpp
#include <curand.h>

float *d_random;
cudaMalloc(&d_random, N * sizeof(float));

curandGenerator_t gen;
curandCreateGenerator(&gen, CURAND_RNG_PSEUDO_DEFAULT);
curandSetPseudoRandomGeneratorSeed(gen, 1234ULL);
curandGenerateUniform(gen, d_random, N);            // [0,1) 均匀分布
// curandGenerateNormal(gen, d_random, N, 0.0f, 1.0f);  // 正态分布
curandDestroyGenerator(gen);
```

#### 设备 API（核函数内部生成）

```cpp
#include <curand_kernel.h>

__global__ void monteCarlo(curandState *states, float *results, int n) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    curand_init(1234ULL, idx, 0, &states[idx]);     // 每线程独立状态

    float sum = 0;
    for (int i = 0; i < n; i++) {
        float x = curand_uniform(&states[idx]);
        sum += x * x;
    }
    results[idx] = sum / n;
}
```

### 8.5 Thrust：STL 风格算法

```cpp
#include <thrust/device_vector.h>
#include <thrust/sort.h>
#include <thrust/reduce.h>

int main() {
    thrust::device_vector<int> d_vec(1000000);
    // 随机填充...
    thrust::sequence(d_vec.begin(), d_vec.end());

    // 排序
    thrust::sort(d_vec.begin(), d_vec.end());

    // 求和
    int sum = thrust::reduce(d_vec.begin(), d_vec.end(), 0);

    // 求最大值
    int maxv = *thrust::max_element(d_vec.begin(), d_vec.end());

    return 0;
}
```

### 8.6 OpenACC：编译指令并行化

OpenACC 用 `#pragma acc` 让 C/C++/Fortran 代码自动跑在 GPU 上，类似 OpenMP。

```cpp
void saxpy(int n, float a, float *x, float *y) {
    #pragma acc parallel loop copyin(x[0:n]) copy(y[0:n])
    for (int i = 0; i < n; i++) {
        y[i] = a * x[i] + y[i];
    }
}
```

编译：`pgcc -acc -ta=tesla saxpy.c`

特点：
- 入门门槛极低，老代码改动最小
- 性能通常不如手写 CUDA，但开发效率高 5-10 倍
- 适合科学计算大循环的快速移植

---

## 第 9 章 多 GPU 编程

多 GPU 是 HPC 和大规模训练的标配。

### 9.1 设备管理

```cpp
int nGpus;
cudaGetDeviceCount(&nGpus);

for (int i = 0; i < nGpus; i++) {
    cudaSetDevice(i);                         // 切换当前设备
    // 该设备上的所有 CUDA 调用此后生效
    cudaMalloc(&d_data[i], nBytes);
    myKernel<<<grid, block>>>(d_data[i]);
}
```

> **关键**：每个 host 线程在任意时刻只能"指向"一个设备，但可以频繁切换。

### 9.2 P2P（Peer-to-Peer）GPU 通信

支持 P2P 的 GPU 之间可以直接互相访问内存（绕过 CPU），通过 PCIe 或 NVLink。

```cpp
// 检查并启用 P2P
int canAccess;
cudaDeviceCanAccessPeer(&canAccess, 0, 1);   // 0 能访问 1 吗?
if (canAccess) {
    cudaSetDevice(0);
    cudaDeviceEnablePeerAccess(1, 0);

    cudaSetDevice(1);
    cudaDeviceEnablePeerAccess(0, 0);
}

// 现在可以直接拷贝
cudaMemcpyPeerAsync(d_dst, dstDev, d_src, srcDev, nBytes, stream);
```

P2P 启用后，UVA（统一虚拟寻址）下，**一个设备的核函数可以直接读另一个设备的全局内存**——但延迟会比本地内存高。

### 9.3 多 GPU 分工模板

```cpp
const int nGpus = 4;
cudaStream_t streams[nGpus];
float *d_data[nGpus];

for (int i = 0; i < nGpus; i++) {
    cudaSetDevice(i);
    cudaStreamCreate(&streams[i]);
    cudaMalloc(&d_data[i], chunkBytes);
    cudaMemcpyAsync(d_data[i], &h_data[i * chunkSize],
                    chunkBytes, cudaMemcpyHostToDevice, streams[i]);
    myKernel<<<grid, block, 0, streams[i]>>>(d_data[i], chunkSize);
}

// 等所有设备完成
for (int i = 0; i < nGpus; i++) {
    cudaSetDevice(i);
    cudaStreamSynchronize(streams[i]);
}
```

### 9.4 跨节点：MPI + CUDA

```cpp
#include <mpi.h>
#include <cuda_runtime.h>

int rank;
MPI_Init(&argc, &argv);
MPI_Comm_rank(MPI_COMM_WORLD, &rank);

cudaSetDevice(rank % nGpus);   // 每进程绑一张卡

float *d_buf;
cudaMalloc(&d_buf, N * sizeof(float));

// 1) 普通 MPI:GPU -> 主机 -> MPI -> 主机 -> GPU
//    需要先 cudaMemcpy 到主机内存
//
// 2) CUDA-aware MPI:直接传 GPU 指针(需要 OpenMPI/MVAPICH 编译时启用 CUDA 支持)
MPI_Send(d_buf, N, MPI_FLOAT, dest, tag, MPI_COMM_WORLD);

// 3) GPUDirect RDMA:CUDA-aware MPI + 支持的 InfiniBand 网卡
//    GPU 内存直接通过网络传输,bypass 主机内存

MPI_Finalize();
```

---

## 第 10 章 程序实现的注意事项

### 10.1 APOD 开发周期

NVIDIA 推荐的 GPU 移植迭代法：

1. **Assess（评估）**：profiling 找热点
2. **Parallelize（并行化）**：移植到 GPU
3. **Optimize（优化）**：针对硬件调优
4. **Deploy（部署）**：上线，再回到第一步

每轮专注最大瓶颈，避免过早优化。

### 10.2 性能分析工具

| 工具 | 用途 |
|------|------|
| **nvprof / nsys** | 整体时间线、API/Kernel 时间统计 |
| **Nsight Systems** | 系统级时间线（CPU+GPU 协同） |
| **Nsight Compute (ncu)** | 单核函数详细分析（占用率、内存效率、指令统计） |
| **Nsight Visual Studio Edition** | Windows IDE 集成调试 |

常用命令：
```bash
# 整体分析
nsys profile -o report --stats=true ./myapp

# 内核详细分析
ncu --set full -o profile ./myapp

# 内存检查（找越界、未初始化访问）
compute-sanitizer --tool memcheck ./myapp

# 竞态检查
compute-sanitizer --tool racecheck ./myapp
```

### 10.3 调试

#### CUDA-GDB（命令行）

```bash
nvcc -g -G myapp.cu -o myapp     # -G 关闭设备代码优化,生成调试信息
cuda-gdb ./myapp
```

CUDA-GDB 命令：
```
(cuda-gdb) break myKernel
(cuda-gdb) run
(cuda-gdb) info cuda threads
(cuda-gdb) cuda thread (5,0,0)        # 切到指定线程上下文
(cuda-gdb) print var_name
```

#### 内核内 printf

```cpp
__global__ void debugKernel(float *data, int n) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < n && data[idx] < 0) {
        printf("[block %d, thread %d] data[%d]=%f is negative!\n",
               blockIdx.x, threadIdx.x, idx, data[idx]);
    }
}
```

> printf 输出会缓冲，必须 `cudaDeviceSynchronize()` 后才能看到。用于条件断言非常方便。

#### assert

```cpp
#include <assert.h>

__global__ void kernel(int *data, int n) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < n) {
        assert(data[idx] >= 0);    // 失败时整个核函数会终止,可被调试器捕获
    }
}
```

### 10.4 错误处理最佳实践

```cpp
// 同步检查:核函数启动后立刻检查启动错误
myKernel<<<grid, block>>>(...);
CHECK(cudaGetLastError());          // 启动错误(配置问题等)

// 异步检查:同步后检查执行错误
CHECK(cudaDeviceSynchronize());     // 执行错误(越界访问等)
```

### 10.5 常见性能"反模式"清单

按经验，多数性能问题来自以下几类（**优化时按此优先级排查**）：

1. **内存访问未合并**：用 `nsys`/`ncu` 看 `gld_efficiency`、`gst_efficiency`，<60% 就该重构
2. **块大小不是 32 的倍数**
3. **过度使用全局内存原子操作**：用共享内存先聚合再写全局
4. **Host-Device 传输过多**：用流重叠 / 统一内存 / 减少传输次数
5. **占用率太低**：寄存器/共享内存用得太多导致 SM 上活跃 warp 少
6. **线程束分化严重**
7. **内核太小**：启动开销淹没了计算时间，考虑合并多个小核函数

### 10.6 移植 C 程序到 CUDA 的一般步骤

1. 用 `gprof`/perf 找热点（通常是 90% 时间花在 10% 代码上）
2. 分析热点循环的数据依赖；独立迭代越多越好
3. 把循环体改造成 `__global__` 核函数；循环变量 → `blockIdx*blockDim+threadIdx`
4. 在循环外加入数据传输（`cudaMalloc` / `cudaMemcpy`）
5. 验证数值正确性（与 CPU 版本对比）
6. profile 优化：合并访问 → 共享内存 → 流并发 → 库替换

---

## 附录 A 通用错误检查宏

放在所有 CUDA 项目的公共头文件里：

```cpp
// common.h
#ifndef _COMMON_H
#define _COMMON_H

#include <stdio.h>
#include <stdlib.h>
#include <sys/time.h>
#include <cuda_runtime.h>

#define CHECK(call)                                                             \
{                                                                               \
    const cudaError_t error = call;                                             \
    if (error != cudaSuccess) {                                                 \
        fprintf(stderr, "CUDA Error: %s:%d, code=%d (%s) when '%s'\n",          \
                __FILE__, __LINE__, error, cudaGetErrorString(error), #call);   \
        exit(EXIT_FAILURE);                                                     \
    }                                                                           \
}

#define CHECK_KERNEL()                                                          \
{                                                                               \
    cudaError_t err = cudaGetLastError();                                       \
    if (err != cudaSuccess) {                                                   \
        fprintf(stderr, "Kernel launch error: %s:%d, %s\n",                     \
                __FILE__, __LINE__, cudaGetErrorString(err));                   \
        exit(EXIT_FAILURE);                                                     \
    }                                                                           \
    CHECK(cudaDeviceSynchronize());                                             \
}

inline double cpuSecond() {
    struct timeval tp;
    gettimeofday(&tp, NULL);
    return (double)tp.tv_sec + (double)tp.tv_usec * 1.e-6;
}

#endif
```

cuBLAS / cuFFT / cuRAND 也要单独的检查宏（错误码类型不一样）：

```cpp
#define CHECK_CUBLAS(call)                                                      \
{                                                                               \
    cublasStatus_t status = call;                                               \
    if (status != CUBLAS_STATUS_SUCCESS) {                                      \
        fprintf(stderr, "cuBLAS error %d at %s:%d\n",                           \
                (int)status, __FILE__, __LINE__);                               \
        exit(EXIT_FAILURE);                                                     \
    }                                                                           \
}

#define CHECK_CURAND(call)                                                      \
{                                                                               \
    curandStatus_t status = call;                                               \
    if (status != CURAND_STATUS_SUCCESS) {                                      \
        fprintf(stderr, "cuRAND error %d at %s:%d\n",                           \
                (int)status, __FILE__, __LINE__);                               \
        exit(EXIT_FAILURE);                                                     \
    }                                                                           \
}
```

---

## 学习路径建议

按照下面的顺序入门最高效：

1. **先把第 2 章的向量加法**完整跑通（`cudaMalloc` / `cudaMemcpy` / 核函数 / 错误检查）
2. **第 3 章的并行归约**逐版本写一遍，观察 `nvprof`/`ncu` 输出，**深刻理解 warp 分化和占用率**
3. **第 4 章的内存合并访问**做一遍（行 / 列拷贝对比），这是后续所有优化的基础
4. **第 5 章用共享内存优化矩阵转置**——这是 SMEM 的"hello world"
5. **第 6 章用流重叠传输**——做一遍 4 流分块加法
6. 之后按需深入：库（cuBLAS/Thrust 替代手写）、多 GPU、调试工具

> **建议每章配套书中的源码（Wrox 出版社 procudac 项目页有下载）一起看，并自己用 `nvprof`/`ncu` 跑一遍量化对比，体感才能上来。**

