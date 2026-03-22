## TestMain 是什么？

Go 的测试框架提供了一个特殊的入口函数 `TestMain`，它让你可以在所有测试运行前后执行自定义逻辑——比如初始化数据库连接、启动 mock server、清理测试数据等。

没有 `TestMain` 之前，这些事情很难优雅地处理。

## 基本用法

```go
func TestMain(m *testing.M) {
    // 测试前：初始化
    setup()

    // 运行所有测试，获取退出码
    code := m.Run()

    // 测试后：清理
    teardown()

    // 必须显式退出，否则 defer 不会执行
    os.Exit(code)
}
```

<div class="detail-callout">
  注意：<code>os.Exit()</code> 会跳过所有 <code>defer</code>，所以清理逻辑要在 <code>os.Exit</code> 之前显式调用。
</div>

## 实际场景：游戏服务器测试

在我们的 gamesvr 项目里，每个测试都需要一个 TcaplusDB 的连接。如果每个测试文件都各自初始化，不仅慢，还很难保证清理干净。用 `TestMain` 之后：

```go
var testClient *tcaplusdb.Client

func TestMain(m *testing.M) {
    var err error
    testClient, err = tcaplusdb.NewClient(testConfig)
    if err != nil {
        log.Fatalf("init test client: %v", err)
    }

    code := m.Run()

    testClient.Close()
    os.Exit(code)
}
```

所有测试共享一个 client，测试速度提升明显，资源管理也更干净。

## 和 TestXxx 函数的关系

`TestMain` 是包级别的，一个包里只能有一个。它包裹了这个包里所有 `Test*`、`Benchmark*`、`Example*` 函数的执行。

如果你需要每个测试前后都做一些事，那应该用 `t.Cleanup()` 或者 helper 函数，而不是 `TestMain`。
