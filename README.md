# ESP32 Fuel Simulator

Simulador educacional de abastecimento com gasolina a R$ 6,55 por litro. Interface em português, visor de valor e volume, tanque animado e telemetria de um ESP32 virtual.

[Usar o simulador](https://brunnojob.github.io/esp32-fuel-simulator/)

## Uso

Escolha por valor, por litros ou completar o tanque. Defina capacidade, nível inicial e vazão. Inicie o abastecimento e acompanhe o visor. O fluxo para automaticamente na meta ou no limite do tanque. É possível pausar, retomar e finalizar antes da meta.

O histórico guarda os últimos 50 abastecimentos neste navegador e pode ser exportado em CSV. Recarregar a página recupera uma sessão ativa em pausa. Trocar de aba também pausa o fluxo.

## Executar localmente

Requer Python 3. Na raiz do projeto:

```sh
python -m http.server 8080 --directory web --bind 127.0.0.1
```

Abra http://localhost:8080. No Windows, também é possível usar `iniciar.bat`.

## Dados

Não utiliza banco de dados, backend, credenciais ou APIs externas. O GitHub Pages hospeda os arquivos estáticos. O estado e o histórico usam localStorage, separado por navegador e endereço. Localhost e Pages não compartilham os registros. Se o armazenamento estiver bloqueado, a sessão funciona em memória.

A configuração fica nos campos do painel. HTML, CSS e JavaScript nativos, sem dependências, instalação de pacotes ou etapa de build.

## Medição

Preço fixo: 655 centavos por litro. O cálculo de metas utiliza mililitros inteiros e o valor exibido é arredondado para centavos. R$ 100 correspondem a uma meta de 15,267 L; 10 L custam R$ 65,50. A meta por valor é truncada em mililitros para não ultrapassar o orçamento.

O sensor virtual calcula 450 pulsos por litro a partir do volume simulado. Não emula o processador, GPIO ou temporização elétrica do ESP32.

## Arduino ESP32

`firmware/fuel_simulator/fuel_simulator.ino` implementa a mesma lógica básica no Arduino Core para ESP32, sem bibliotecas externas. Abra na Arduino IDE, selecione ESP32 Dev Module e use o monitor serial a 115200 baud, com nova linha e ponto decimal.

Comandos: `MONEY 100`, `LITRES 10`, `FULL`, `PAUSE`, `RESUME`, `STOP`, `RESET`.

O sketch simula vazão de 30 L/min, tanque de 50 L e 10 L iniciais. É independente da interface web. Não lê sensores nem aciona bombas reais. Não foi validado em hardware físico.

## Testes

Requer Node.js 22 ou superior:

```sh
npm test
```

Os testes cobrem preço, orçamento, capacidade, entradas inválidas e evolução temporal. O workflow executa os testes antes de publicar no Pages.

## GitHub Pages

Em Settings > Pages > Build and deployment, selecione GitHub Actions. O workflow `.github/workflows/pages.yml` publica `web/` quando há push em `main`.

## Licença

MIT. [brunnodev.store](https://brunnodev.store)
