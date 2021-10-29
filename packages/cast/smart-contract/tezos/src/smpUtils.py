import smartpy as sp
import os


def importContract(pathFromRoot):
    (_, contractName) = os.path.splitext(os.path.basename(pathFromRoot))
    code = open(os.path.join(os.getcwd(), 'src', pathFromRoot), "r").read()
    return sp.io.import_script_from_script(contractName, code)
