## GStreamer 的 Probe 是什么？

在 GStreamer 的 pipeline 中，数据以 buffer 的形式在各个 element 之间流动。Probe 是一种在 pad（数据流的端口）上注册回调函数的机制，让你可以在不修改 element 源码的情况下，拦截、检查甚至修改流过的数据。

可以把它理解成 pipeline 的"中间件"或"拦截器"。

## 典型使用场景

- 在解码后的帧上运行自定义算法（比如目标检测后处理）
- 统计帧率、丢帧情况
- 按条件丢弃某些帧
- 在帧上叠加 metadata

## 代码示例

在 DeepStream 的场景里，我们经常需要在 `nvinfer`（推理）之后，`nvtracker`（跟踪）之前插入自定义逻辑：

```cpp
static GstPadProbeReturn
infer_src_pad_buffer_probe(GstPad *pad,
                           GstPadProbeInfo *info,
                           gpointer u_data) {
    GstBuffer *buf = GST_PAD_PROBE_INFO_BUFFER(info);

    // 获取 DeepStream meta
    NvDsBatchMeta *batch_meta = gst_buffer_get_nvds_batch_meta(buf);
    if (!batch_meta) return GST_PAD_PROBE_OK;

    // 遍历每一帧
    for (NvDsFrameMetaList *l = batch_meta->frame_meta_list;
         l != NULL; l = l->next) {
        NvDsFrameMeta *frame_meta = (NvDsFrameMeta *)l->data;

        // 遍历该帧的检测结果
        for (NvDsObjectMetaList *ol = frame_meta->obj_meta_list;
             ol != NULL; ol = ol->next) {
            NvDsObjectMeta *obj = (NvDsObjectMeta *)ol->data;

            // 自定义逻辑：过滤低置信度目标
            if (obj->confidence < 0.5f) {
                nvds_remove_obj_meta_from_frame(frame_meta, obj);
            }
        }
    }
    return GST_PAD_PROBE_OK;
}

// 注册 probe
GstPad *infer_src_pad = gst_element_get_static_pad(pgie, "src");
gst_pad_add_probe(infer_src_pad,
                  GST_PAD_PROBE_TYPE_BUFFER,
                  infer_src_pad_buffer_probe,
                  NULL, NULL);
```

## 性能注意事项

Probe 回调在 pipeline 的 streaming thread 里同步执行，如果回调太慢会直接影响帧率。几个原则：

- 耗时操作要异步化，probe 里只做轻量操作
- 避免在 probe 里分配/释放大块内存
- 如果要访问 GPU 数据，注意同步点的开销

在我们的 32 路 1080p 场景下，probe 的执行时间控制在 0.5ms 以内，对帧率没有可见影响。
