export function getKoreanAuthError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않아요.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "이메일 인증을 먼저 완료해주세요.";
  }

  if (normalizedMessage.includes("user already registered")) {
    return "이미 가입된 이메일이에요. 로그인해주세요.";
  }

  if (
    normalizedMessage.includes("password should be") ||
    normalizedMessage.includes("weak password")
  ) {
    return "비밀번호는 6자 이상으로 입력해주세요.";
  }

  if (
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("too many requests")
  ) {
    return "요청이 너무 많아요. 잠시 후 다시 시도해주세요.";
  }

  if (normalizedMessage.includes("signup is disabled")) {
    return "현재 이메일 회원가입이 비활성화되어 있어요.";
  }

  if (
    normalizedMessage.includes("failed to fetch") ||
    normalizedMessage.includes("network")
  ) {
    return "네트워크 연결을 확인한 뒤 다시 시도해주세요.";
  }

  return "인증 처리 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.";
}
