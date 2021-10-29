import smartpy as sp
import src.smpUtils as SPU


class Signature():
    def __init__(self, inputType, outputType):
        self.inputType = inputType
        self.outputType = outputType


def safeLambda(signature: Signature):
    def decorator(func):
        def wrapper(params):
            sp.set_type(params, signature.inputType)

            result = func(params)
            sp.set_type(result, signature.outputType)

            sp.result(result)
        return wrapper
    return decorator


def loadLambda(entrypointsBigMap, name, signature: Signature):
    epBytesScript = entrypointsBigMap[sp.pack(name)]

    epScript = sp.unpack(
        epBytesScript,
        t=sp.TLambda(
            signature.inputType,
            signature.outputType
        ))

    return epScript.open_some()
