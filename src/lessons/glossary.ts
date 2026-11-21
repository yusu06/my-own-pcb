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
  led: {
    term: "LED",
    short: "전류가 흐르면 빛을 내는 부품(발광 다이오드). 한쪽 방향으로만 전류가 흐른다.",
  },
};
