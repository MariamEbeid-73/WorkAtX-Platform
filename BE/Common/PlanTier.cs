namespace BE.Common
{
    public class PlanTier
    {
        private static readonly Dictionary<string, int> Order = new()
        {
            ["free"] = 0,
            ["pro"] = 1,
            ["elite"] = 2,
        };

        public static bool AtLeast(string actualPlan, string requiredPlan)
        {
            var actual = Order.GetValueOrDefault(actualPlan, 0);
            var required = Order.GetValueOrDefault(requiredPlan, 0);
            return actual >= required;
        }
    }
}
