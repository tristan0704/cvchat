class PcmInputProcessor extends AudioWorkletProcessor {
    process(inputs, outputs) {
        const inputChannel = inputs[0]?.[0]
        const outputChannel = outputs[0]?.[0]

        if (inputChannel && outputChannel) {
            outputChannel.set(inputChannel)
            this.port.postMessage(inputChannel.slice())
        } else if (outputChannel) {
            outputChannel.fill(0)
        }

        return true
    }
}

registerProcessor("pcm-input-processor", PcmInputProcessor)
