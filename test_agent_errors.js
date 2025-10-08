// test_agent_errors.js - Arquivo de exemplo com múltiplos erros para testar o sistema
// Este arquivo foi criado intencionalmente com erros para demonstrar o CodeErrorAnalyzer

import express from 'express'
import { chatHandler } from './src/agent.js';
import { nonExistentModule } from './module_que_nao_existe'; // Erro: módulo não existe

var oldVar = 'usando var ao invés de let/const'; // Problema: uso de var

// Função duplicada
function processMessage(text) {
    console.log("Primeira versão");
    return text;
}

// Erro: função duplicada
function processMessage(text) {
    console.log("Segunda versão - conflito!");
    return text.toUpperCase();
}

// Erro de sintaxe: chaves não balanceadas
function badSyntax() {
    if (true) {
        console.log("Faltou fechar a chave"
    }
}

// Erro: comparação ao invés de atribuição
function checkValue(x) {
    if (x = 10) { // Deveria ser ==
        return true;
    }
    return false;
}

// Problema de segurança: credencial hardcoded
const API_KEY = "sk-1234567890abcdef"; // Nunca faça isso!
const PASSWORD = "senha123"; // Credencial exposta

// Problema de performance: loop aninhado O(n²)
function badPerformance(arr) {
    for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr.length; j++) {
            console.log(arr[i] + arr[j]); // Problema de performance
        }
    }
}

// Problema: variável não utilizada
const unusedVariable = "Esta variável nunca é usada";

// Problema: import não utilizado (seria detectado se o módulo existisse)
import { neverUsedFunction } from './some_module.js'; // Import não usado

// Problema: console.log esquecido
function productionCode() {
    console.log("Debug message - deveria ser removido"); // Problema: console.log em produção
    return "result";
}

// Problema: try/catch vazio
function dangerousOperation() {
    try {
        riskyOperation();
    } catch (e) {
        // Erro: catch vazio - erro silenciado
    }
}

// Problema: async/await mal usado
function asyncProblem() {
    await fetch('https://api.example.com'); // Erro: await fora de função async
}

// Problema: eval é perigoso
function unsafeCode(userInput) {
    return eval(userInput); // Problema de segurança crítico
}

// Problema: innerHTML pode causar XSS
function unsafeDOM(userContent) {
    document.getElementById('content').innerHTML = userContent; // XSS risk
}

// Problema: Math.random() não é criptograficamente seguro
function insecureRandom() {
    return Math.random().toString(36); // Problema de segurança
}

// Classe duplicada
class MessageProcessor {
    process(msg) {
        return msg;
    }
}

// Erro: classe duplicada
class MessageProcessor {
    handle(msg) {
        return msg.toLowerCase();
    }
}

// Problema: parênteses não balanceados
const malformedArray = [1, 2, 3, 4, 5;

// Problema: redeclaração de variável
const userName = "João";
const userName = "Maria"; // Erro: redeclaração

// Problema: uso de == ao invés de ===
function loosEquality(a, b) {
    return a == b; // Deveria usar ===
}

// Problema: setInterval sem clearInterval
function memoryLeak() {
    setInterval(() => {
        console.log("This will leak memory");
    }, 1000);
    // Sem clearInterval correspondente
}

// Problema: função muito complexa com muitos parâmetros
function complexFunction(a, b, c, d, e, f, g, h, i, j) { // Muitos parâmetros
    // Muita complexidade
    if (a > 0) {
        if (b > 0) {
            if (c > 0) {
                if (d > 0) { // Aninhamento excessivo
                    if (e > 0) {
                        return a + b + c + d + e;
                    }
                }
            }
        }
    }
    return 0;
}

// Export sem problemas para testar que nem tudo é erro
export { processMessage, badPerformance };