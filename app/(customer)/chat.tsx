import { useState, useRef, useEffect } from "react"; // ← Add useRef, useEffect
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";

export default function AIPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false); // ← Add loading state
  const scrollViewRef = useRef<ScrollView>(null); // ← Auto-scroll

  const askAI = async () => {
    if (!question.trim() || loading) return;

    const userMsg = { type: "user", text: question };
    setMessages(prev => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch("https://mechanic-finder-backend.onrender.com/api/ai/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question: question.trim() }) // ← Trim
      });

      const data = await res.json();

      const botMsg = {
        type: "bot",
        text: data.reply || "Quick check: Fuel? Battery? Find mechanics nearby!" // ← Better fallback
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.log("AI ERROR:", err);
      setMessages(prev => [
        ...prev,
        { 
          type: "bot", 
          text: "⚠️ Network error. Check connection or try again!" 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ← Auto-scroll to bottom
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <View style={{ flex: 1, padding: 10, backgroundColor: "#111" }}>
      <Text style={{
        color: "#fff",
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 10
      }}>
        AI Mechanic Assistant 🤖
      </Text>
      
      {messages.length === 0 && (
        <Text style={{ color: "#aaa", textAlign: "center", marginTop: 50 }}>
          Ask: "Car won't start" or "Engine overheating" 🚗
        </Text>
      )}
      
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 10 }}
      >
        {messages.map((msg, index) => (
          <View
            key={index}
            style={{
              alignSelf: msg.type === "user" ? "flex-end" : "flex-start",
              backgroundColor: msg.type === "user" ? "#f59e0b" : "#333",
              padding: 12,
              marginVertical: 5,
              borderRadius: 15,
              maxWidth: "80%",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3
            }}
          >
            <Text style={{ 
              color: "#fff", 
              fontSize: 16,
              lineHeight: 22 
            }}>
              {msg.text}
            </Text>
          </View>
        ))}
        
        {loading && (
          <View style={{
            alignSelf: "flex-start",
            backgroundColor: "#444",
            padding: 12,
            marginVertical: 5,
            borderRadius: 15,
            maxWidth: "80%"
          }}>
            <Text style={{ color: "#aaa", fontStyle: "italic" }}>
              AI is thinking... 🤔
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={{ flexDirection: "row", marginTop: 10 }}>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Ask about car issues..."
          placeholderTextColor="#aaa"
          editable={!loading} // ← Disable while loading
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#444",
            borderRadius: 15,
            padding: 12,
            color: "#fff",
            fontSize: 16
          }}
          onSubmitEditing={askAI} // ← Send on Enter
        />
        <TouchableOpacity
          onPress={askAI}
          disabled={loading || !question.trim()}
          style={{
            backgroundColor: loading || !question.trim() ? "#666" : "#f59e0b",
            padding: 12,
            marginLeft: 8,
            borderRadius: 15,
            justifyContent: "center"
          }}
        >
          <Text style={{ 
            color: "#fff", 
            fontWeight: "bold",
            fontSize: 16
          }}>
            {loading ? "..." : "Send"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}