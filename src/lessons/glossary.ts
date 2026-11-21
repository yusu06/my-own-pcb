export const GLOSSARY: Record<string, { term: string; short: string }> = {
  circuit: { term: "회로", short: "전기가 지나가는 길 전체. 전지, 전선, 부품이 하나로 이어진 것." },
  "closed-circuit": {
    term: "닫힌 회로",
    short: "전지의 +에서 나와 −로 돌아오는 고리가 끊김 없이 이어진 상태. 이때만 전류가 흐른다.",
  },
  current: { term: "전류", short: "전선 속을 흐르는 전기의 양. 단위는 암페어(A), 작은 값은 밀리암페어(mA)." },
  voltage: { term: "전압", short: "전기를 밀어내는 힘의 크기. 단위는 볼트(V). 건전지 하나는 약 1.5V." },
  battery: { term: "전지", short: "전압을 만들어 주는 부품. + 극과 − 극이 있다." },
  switch: { term: "스위치", short: "회로의 고리를 잇거나 끊는 부품. 누르는 동안만 이어지는 것은 버튼이라고 부른다." },
  lamp: { term: "전구", short: "전류가 흐르면 필라멘트가 뜨거워지며 빛을 내는 부품. 방향 상관없이 켜진다." },
  resistor: { term: "저항", short: "전류가 흐르기 어렵게 만드는 부품. 값이 클수록 전류가 적게 흐른다. 단위는 옴(Ω)." },
  "ohms-law": { term: "옴의 법칙", short: "전압 = 전류 × 저항 (V = I × R). 셋 중 둘을 알면 나머지를 구할 수 있다." },
  series: { term: "직렬", short: "부품을 한 줄로 이어 붙인 연결. 전류가 모든 부품을 차례로 지나간다." },
  parallel: { term: "병렬", short: "부품을 나란히 연결해 전류가 지나갈 길이 여러 개인 연결." },
  "short-circuit": { term: "합선", short: "전지의 +와 −가 부품 없이 바로 이어진 상태. 전류가 엄청나게 흘러 위험하다." },
  "nc-switch": { term: "평상시 닫힘 스위치", short: "아무것도 안 할 때는 이어져 있고, 누르면 끊기는 스위치(NC)." },
  transistor: { term: "트랜지스터", short: "작은 전류로 큰 전류를 켜고 끄는 ‘전기로 누르는 스위치’ 부품." },
  "logic-gate": { term: "논리 게이트", short: "입력 신호(0/1)를 받아 정해진 규칙(AND, OR, NOT 등)대로 출력을 내는 회로." },
  led: {
    term: "LED",
    short: "전류가 흐르면 빛을 내는 부품(발광 다이오드). 한쪽 방향으로만 전류가 흐른다.",
  },
};
