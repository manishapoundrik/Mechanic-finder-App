import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";

export default function AIPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<any[]>([]);

  const askAI = async () => {
    if (!question) return;

    const userMsg = { type: "user", text: question };

    setMessages(prev => [...prev, userMsg]);
    setQuestion("");

    try {
      const res = await fetch("https://mechanic-finder-backend.onrender.com/api/ai/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question })
      });

      const data = await res.json();

const botMsg = {
  type: "bot",
  text: data.reply || data.error || "No response"
};

      setMessages(prev => [...prev, botMsg]);

    } catch (err) {
  console.log("AI ERROR:", err); // 🔥 add this
  setMessages(prev => [
    ...prev,
    { type: "bot", text: "Server error" }
  ]);
}

  return (
    <View style={{ flex: 1, padding: 10, backgroundColor: "#111" }}>
        <Text style={{
  color: "#fff",
  fontSize: 20,
  fontWeight: "bold",
  marginBottom: 10
}}>
  AI Assistant 🤖
</Text>
{messages.length === 0 && (
  <Text style={{ color: "#aaa", textAlign: "center", marginTop: 50 }}>
    Ask anything about your vehicle 🚗
  </Text>
)}
      <ScrollView
  style={{ flex: 1 }}
  ref={ref => ref?.scrollToEnd({ animated: true })}
>
        {messages.map((msg, index) => (
          <View
            key={index}
            style={{
              alignSelf: msg.type === "user" ? "flex-end" : "flex-start",
              backgroundColor: msg.type === "user" ? "#f59e0b" : "#333",
              padding: 10,
              marginVertical: 5,
              borderRadius: 10,
              maxWidth: "80%"
            }}
          >
            <Text style={{ color: "#fff" }}>{msg.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={{ flexDirection: "row", marginTop: 10 }}>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Ask something..."
          placeholderTextColor="#aaa"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#444",
            borderRadius: 10,
            padding: 10,
            color: "#fff"
          }}
        />

        <TouchableOpacity
          onPress={askAI}
          style={{
            backgroundColor: "#f59e0b",
            padding: 12,
            marginLeft: 8,
            borderRadius: 10
          }}
        >
          <Text style={{ color: "#fff" }}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
}